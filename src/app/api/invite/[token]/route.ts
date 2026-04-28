import { db } from "@/lib/db";
import { reunion, invite, household, householdMember } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashToken } from "@/lib/tokens";
import { geocodeAddress } from "@/lib/geocode";
import { sendEmail } from "@/lib/email";
import { RSVPConfirmationEmail } from "@/emails/RSVPConfirmationEmail";
import { NextResponse } from "next/server";

type InviteRsvpStatus = "yes" | "no" | "maybe";

type InviteMemberInput = {
  name?: unknown;
  ageGroup?: unknown;
  age?: unknown;
};

function isInviteRsvpStatus(value: unknown): value is InviteRsvpStatus {
  return value === "yes" || value === "no" || value === "maybe";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const [inviteRow] = await db
    .select()
    .from(invite)
    .where(eq(invite.tokenHash, tokenHash));

  if (!inviteRow) {
    return NextResponse.json(
      { error: "Invalid invite", reason: "not_found" },
      { status: 404 }
    );
  }

  if (inviteRow.status !== "pending") {
    return NextResponse.json(
      { error: "Invalid invite", reason: inviteRow.status },
      { status: 400 }
    );
  }

  if (inviteRow.expiresAt && new Date(inviteRow.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "Invalid invite", reason: "expired" },
      { status: 400 }
    );
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, inviteRow.reunionId));

  return NextResponse.json({
    reunion: {
      name: reunionRow?.name ?? "Family Reunion",
      description: reunionRow?.description ?? null,
    },
    invite: {
      email: inviteRow.email,
    },
    reunionId: inviteRow.reunionId,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const [inviteRow] = await db
    .select()
    .from(invite)
    .where(eq(invite.tokenHash, tokenHash));

  if (!inviteRow) {
    return NextResponse.json(
      { error: "Invalid invite", reason: "not_found" },
      { status: 404 }
    );
  }

  if (inviteRow.status !== "pending") {
    return NextResponse.json(
      { error: "Invalid invite", reason: inviteRow.status },
      { status: 400 }
    );
  }

  if (inviteRow.expiresAt && new Date(inviteRow.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "Invalid invite", reason: "expired" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const {
    name,
    rsvpStatus,
    partySize,
    city,
    state,
    zipCode,
    dietaryNeeds,
    arrivalNotes,
    departureNotes,
    members,
  } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  if (!isInviteRsvpStatus(rsvpStatus)) {
    return NextResponse.json(
      { error: "rsvpStatus must be yes, no, or maybe" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(partySize) || partySize < 1) {
    return NextResponse.json(
      { error: "partySize must be a positive whole number" },
      { status: 400 }
    );
  }

  // Geocode if location provided
  let lat: number | null = null;
  let lng: number | null = null;

  if (city && state && zipCode) {
    try {
      const geo = await geocodeAddress(city, state, zipCode);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } catch (error) {
      console.warn("Geocoding failed, proceeding without coordinates:", error);
    }
  }

  const rawMembers = Array.isArray(members)
    ? (members as InviteMemberInput[])
    : [];
  for (const member of rawMembers) {
    if (
      member.age !== undefined &&
      (typeof member.age !== "number" ||
        !Number.isInteger(member.age) ||
        member.age < 0)
    ) {
      return NextResponse.json(
        { error: "Member ages must be whole numbers greater than or equal to 0" },
        { status: 400 }
      );
    }
  }

  const normalizedMembers = rawMembers
    .filter((member) => typeof member.name === "string" && member.name.trim())
    .map((member) => ({
      name: (member.name as string).trim(),
      ageGroup: member.ageGroup === "child" ? "child" as const : "adult" as const,
      age: typeof member.age === "number" ? member.age : null,
    }));

  const newHousehold = await db.transaction(async (tx) => {
    const householdValues = {
      primaryContactName: name.trim(),
      primaryContactEmail: inviteRow.email,
      invitationStatus: "accepted" as const,
      rsvpStatus,
      partySize,
      city: city ?? null,
      state: state ?? null,
      zipCode: zipCode ?? null,
      lat,
      lng,
      dietaryNeeds: dietaryNeeds ?? null,
      arrivalNotes: arrivalNotes ?? null,
      departureNotes: departureNotes ?? null,
      updatedAt: new Date(),
    };

    const [acceptedHousehold] = inviteRow.householdId
      ? await tx
          .update(household)
          .set(householdValues)
          .where(eq(household.id, inviteRow.householdId))
          .returning()
      : await tx
          .insert(household)
          .values({
            reunionId: inviteRow.reunionId,
            ...householdValues,
          })
          .returning();

    if (!acceptedHousehold) {
      throw new Error("Linked household not found");
    }

    if (inviteRow.householdId) {
      await tx
        .delete(householdMember)
        .where(eq(householdMember.householdId, acceptedHousehold.id));
    }

    if (normalizedMembers.length > 0) {
      await tx.insert(householdMember).values(
        normalizedMembers.map((member) => ({
          householdId: acceptedHousehold.id,
          ...member,
        }))
      );
    }

    await tx
      .update(invite)
      .set({ status: "accepted", householdId: acceptedHousehold.id })
      .where(eq(invite.id, inviteRow.id));

    return acceptedHousehold;
  });

  // Send RSVP confirmation email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const claimUrl = `${appUrl}/login?claim=${newHousehold.id}`;

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, inviteRow.reunionId));

  try {
    await sendEmail({
      to: inviteRow.email,
      subject: `RSVP Confirmed – ${reunionRow?.name ?? "Family Reunion"}`,
      react: RSVPConfirmationEmail({
        reunionName: reunionRow?.name ?? "Family Reunion",
        claimUrl,
        rsvpStatus,
      }),
    });
  } catch (error) {
    console.error("Failed to send RSVP confirmation email:", error);
  }

  // Fetch members for the response
  const householdMembers = await db
    .select()
    .from(householdMember)
    .where(eq(householdMember.householdId, newHousehold.id));

  return NextResponse.json(
    { ...newHousehold, members: householdMembers },
    { status: 201 }
  );
}
