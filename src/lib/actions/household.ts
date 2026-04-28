"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { household, householdMember, invite, reunion } from "@/db/schema";
import { InviteEmail } from "@/emails/InviteEmail";
import { sendEmail } from "@/lib/email";
import { geocodeAddress } from "@/lib/geocode";
import { generateToken, getInviteUrl, hashToken } from "@/lib/tokens";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import type { AgeGroup, Household } from "@/types";

type HouseholdMemberInput = {
  id?: string;
  name: string;
  ageGroup: AgeGroup;
  age?: number;
};

type CreateHouseholdInput = {
  primaryContactName: string;
  primaryContactEmail?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  members?: HouseholdMemberInput[];
};

type UpdateHouseholdInput = {
  primaryContactName?: string;
  primaryContactEmail?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  partySize?: number;
  members?: HouseholdMemberInput[];
};

function normalizeRequiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalEmail(value?: string | null): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeOptionalState(value?: string | null): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeOptionalAge(value?: number): number | null {
  if (value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Member ages must be whole numbers greater than or equal to 0");
  }

  return value;
}

function normalizeMembers(
  members?: HouseholdMemberInput[]
): Array<{ name: string; ageGroup: AgeGroup; age: number | null }> | undefined {
  if (members === undefined) {
    return undefined;
  }

  return members.map((member, index) => {
    if (!member || typeof member !== "object") {
      throw new Error(`Member ${index + 1} is invalid`);
    }

    const name = normalizeRequiredText(member.name, `Member ${index + 1} name`);
    if (member.ageGroup !== "adult" && member.ageGroup !== "child") {
      throw new Error(`Member ${index + 1} age group is invalid`);
    }

    return {
      name,
      ageGroup: member.ageGroup,
      age: normalizeOptionalAge(member.age),
    };
  });
}

async function requireOrganizerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

async function requireOrganizerReunion(reunionId: string) {
  const session = await requireOrganizerSession();
  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));

  if (!reunionRow) {
    throw new Error("Not found");
  }

  if (reunionRow.organizerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  return { session, reunionRow };
}

async function requireOrganizerHousehold(householdId: string) {
  const session = await requireOrganizerSession();
  const [householdRow] = await db
    .select()
    .from(household)
    .where(eq(household.id, householdId));

  if (!householdRow) {
    throw new Error("Not found");
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, householdRow.reunionId));

  if (!reunionRow) {
    throw new Error("Not found");
  }

  if (reunionRow.organizerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  return { session, reunionRow, householdRow };
}

async function geocodeHouseholdLocation(
  city: string | null,
  state: string | null,
  zipCode: string | null
) {
  if (!city || !state || !zipCode) {
    return { lat: null, lng: null };
  }

  try {
    const geocoded = await geocodeAddress(city, state, zipCode);
    if (!geocoded) {
      return { lat: null, lng: null };
    }

    return { lat: geocoded.lat, lng: geocoded.lng };
  } catch (error) {
    console.warn("Household geocoding failed; continuing without coordinates.", error);
    return { lat: null, lng: null };
  }
}

export async function createHousehold(
  reunionId: string,
  data: CreateHouseholdInput
): Promise<Household> {
  const { session } = await requireOrganizerReunion(reunionId);
  const primaryContactName = normalizeRequiredText(
    data.primaryContactName,
    "Primary contact name"
  );
  const primaryContactEmail = normalizeOptionalEmail(data.primaryContactEmail);
  const phone = normalizeOptionalText(data.phone);
  const city = normalizeOptionalText(data.city);
  const state = normalizeOptionalState(data.state);
  const zipCode = normalizeOptionalText(data.zipCode);
  const members = normalizeMembers(data.members) ?? [];
  const { lat, lng } = await geocodeHouseholdLocation(city, state, zipCode);
  const partySize = 1 + members.length;

  const createdHousehold = await db.transaction(async (tx) => {
    const [insertedHousehold] = await tx
      .insert(household)
      .values({
        reunionId,
        primaryContactName,
        primaryContactEmail,
        phone,
        invitationStatus: "not_sent",
        rsvpStatus: "pending",
        partySize,
        city,
        state,
        zipCode,
        lat,
        lng,
        createdBy: session.user.id,
      })
      .returning();

    if (members.length > 0) {
      await tx.insert(householdMember).values(
        members.map((member) => ({
          householdId: insertedHousehold.id,
          name: member.name,
          ageGroup: member.ageGroup,
          age: member.age,
        }))
      );
    }

    return insertedHousehold;
  });

  revalidatePath(`/reunion/${reunionId}`);
  return createdHousehold;
}

export async function updateHousehold(
  householdId: string,
  data: UpdateHouseholdInput
): Promise<Household> {
  const { session, reunionRow, householdRow } =
    await requireOrganizerHousehold(householdId);

  const updateData: Partial<typeof household.$inferInsert> = {
    updatedAt: new Date(),
    lastEditedBy: session.user.id,
  };

  if (data.primaryContactName !== undefined) {
    updateData.primaryContactName = normalizeRequiredText(
      data.primaryContactName,
      "Primary contact name"
    );
  }

  if (data.primaryContactEmail !== undefined) {
    updateData.primaryContactEmail = normalizeOptionalEmail(
      data.primaryContactEmail
    );
  }

  if (data.phone !== undefined) {
    updateData.phone = normalizeOptionalText(data.phone);
  }

  if (data.city !== undefined) {
    updateData.city = normalizeOptionalText(data.city);
  }

  if (data.state !== undefined) {
    updateData.state = normalizeOptionalState(data.state);
  }

  if (data.zipCode !== undefined) {
    updateData.zipCode = normalizeOptionalText(data.zipCode);
  }

  if (data.partySize !== undefined) {
    if (!Number.isInteger(data.partySize) || data.partySize < 1) {
      throw new Error("Party size must be a whole number greater than 0");
    }
    updateData.partySize = data.partySize;
  }

  const members = normalizeMembers(data.members);
  if (members !== undefined && data.partySize === undefined) {
    updateData.partySize = 1 + members.length;
  }

  if (
    data.city !== undefined ||
    data.state !== undefined ||
    data.zipCode !== undefined
  ) {
    const city = updateData.city ?? householdRow.city ?? null;
    const state = updateData.state ?? householdRow.state ?? null;
    const zipCode = updateData.zipCode ?? householdRow.zipCode ?? null;
    const geocoded = await geocodeHouseholdLocation(city, state, zipCode);
    updateData.lat = geocoded.lat;
    updateData.lng = geocoded.lng;
  }

  const updatedHousehold = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(household)
      .set(updateData)
      .where(eq(household.id, householdId))
      .returning();

    if (members !== undefined) {
      await tx
        .delete(householdMember)
        .where(eq(householdMember.householdId, householdId));

      if (members.length > 0) {
        await tx.insert(householdMember).values(
          members.map((member) => ({
            householdId,
            name: member.name,
            ageGroup: member.ageGroup,
            age: member.age,
          }))
        );
      }
    }

    return updated;
  });

  revalidatePath(`/reunion/${reunionRow.id}`);
  return updatedHousehold;
}

export async function deleteHousehold(householdId: string): Promise<void> {
  const { reunionRow } = await requireOrganizerHousehold(householdId);

  await db.transaction(async (tx) => {
    await tx.delete(invite).where(eq(invite.householdId, householdId));
    await tx.delete(household).where(eq(household.id, householdId));
  });

  revalidatePath(`/reunion/${reunionRow.id}`);
}

export async function sendHouseholdInvite(
  householdId: string
): Promise<{ success: true } | { error: string }> {
  const { session, reunionRow, householdRow } =
    await requireOrganizerHousehold(householdId);

  const email = normalizeOptionalEmail(householdRow.primaryContactEmail);
  if (!email) {
    return { error: "This household needs an email address before you can send an invite." };
  }

  const existingInvites = await db
    .select()
    .from(invite)
    .where(
      and(eq(invite.reunionId, reunionRow.id), eq(invite.email, email))
    );

  const now = new Date();
  const hasActiveInvite = existingInvites.some((existingInvite) => {
    if (existingInvite.status === "accepted") {
      return true;
    }

    return (
      existingInvite.status === "pending" &&
      new Date(existingInvite.expiresAt) > now
    );
  });

  if (hasActiveInvite || householdRow.claimedAt) {
    return { error: "This household already has an active or accepted invite." };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const organizerName =
    session.user.name?.trim() ||
    session.user.email?.trim() ||
    "The KinCircle organizer";

  try {
    await db
      .insert(invite)
      .values({
        reunionId: reunionRow.id,
        tokenHash,
        email,
        householdId,
        status: "pending",
        expiresAt,
      })
      .returning();

    await sendEmail({
      to: email,
      subject: `You're invited to ${reunionRow.name}!`,
      react: InviteEmail({
        reunionName: reunionRow.name,
        organizerName,
        inviteUrl: getInviteUrl(token),
      }),
    });

    await db
      .update(household)
      .set({
        invitationStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(household.id, householdId));

    revalidatePath(`/reunion/${reunionRow.id}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send household invite to ${email}:`, error);

    await db
      .delete(invite)
      .where(
        and(
          eq(invite.reunionId, reunionRow.id),
          eq(invite.email, email),
          eq(invite.tokenHash, tokenHash)
        )
      );

    return { error: "Failed to send invite email. Please try again." };
  }
}
