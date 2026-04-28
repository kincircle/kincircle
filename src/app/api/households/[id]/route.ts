import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, householdMember } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { geocodeAddress } from "@/lib/geocode";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch household
  const [hh] = await db
    .select()
    .from(household)
    .where(eq(household.id, id));

  if (!hh) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Authorization: must be claimed owner OR reunion organizer
  let authorized = hh.claimedByUserId === session.user.id;
  if (!authorized) {
    const [r] = await db
      .select()
      .from(reunion)
      .where(eq(reunion.id, hh.reunionId));
    if (r && r.organizerId === session.user.id) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch members
  const members = await db
    .select()
    .from(householdMember)
    .where(eq(householdMember.householdId, id));

  return NextResponse.json({ ...hh, members });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Fetch household
  const [hh] = await db
    .select()
    .from(household)
    .where(eq(household.id, id));

  if (!hh) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mode 1: Claim
  if (body.action === "claim") {
    if (hh.claimedByUserId) {
      return NextResponse.json(
        { error: "Already claimed" },
        { status: 409 }
      );
    }

    const [updated] = await db
      .update(household)
      .set({
        claimedByUserId: session.user.id,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(household.id, id))
      .returning();

    return NextResponse.json(updated);
  }

  // Mode 2: Edit — must be claimed owner
  if (hh.claimedByUserId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the claimed owner can edit this household" },
      { status: 403 }
    );
  }

  const {
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

  // Build update payload with only provided fields
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (rsvpStatus !== undefined) updateData.rsvpStatus = rsvpStatus;
  if (partySize !== undefined) updateData.partySize = partySize;
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (zipCode !== undefined) updateData.zipCode = zipCode;
  if (dietaryNeeds !== undefined) updateData.dietaryNeeds = dietaryNeeds;
  if (arrivalNotes !== undefined) updateData.arrivalNotes = arrivalNotes;
  if (departureNotes !== undefined) updateData.departureNotes = departureNotes;

  // Re-geocode if location fields changed
  const cityVal = city ?? hh.city;
  const stateVal = state ?? hh.state;
  const zipVal = zipCode ?? hh.zipCode;
  const locationChanged =
    city !== undefined || state !== undefined || zipCode !== undefined;

  if (locationChanged && cityVal && stateVal && zipVal) {
    const geo = await geocodeAddress(cityVal, stateVal, zipVal);
    if (geo) {
      updateData.lat = geo.lat;
      updateData.lng = geo.lng;
    }
  }

  const [updated] = await db
    .update(household)
    .set(updateData)
    .where(eq(household.id, id))
    .returning();

  // Handle members: delete existing + re-insert
  if (members && Array.isArray(members)) {
    await db
      .delete(householdMember)
      .where(eq(householdMember.householdId, id));

    if (members.length > 0) {
      await db.insert(householdMember).values(
        members.map(
          (m: { name: string; ageGroup?: string; age?: number }) => ({
            householdId: id,
            name: m.name,
            ageGroup: (m.ageGroup === "child" ? "child" : "adult") as "adult" | "child",
            age: m.age ?? null,
          })
        )
      );
    }
  }

  // Fetch fresh members for response
  const freshMembers = await db
    .select()
    .from(householdMember)
    .where(eq(householdMember.householdId, id));

  return NextResponse.json({ ...updated, members: freshMembers });
}
