import { randomUUID } from "node:crypto";
import {
  dateOption as dateOptionTable,
  dateVote as dateVoteTable,
  household as householdTable,
  invite as inviteTable,
  reunion as reunionTable,
} from "../../src/db/schema";
import { generateToken, hashToken } from "../../src/lib/tokens";
import { getTestDb } from "../setup/db";

export async function createTestReunion(
  organizerId: string,
  input?: {
    name?: string;
    description?: string | null;
    status?: "planning" | "date_locked" | "finalized" | "cancelled";
  }
) {
  const db = getTestDb();
  const [reunion] = await db
    .insert(reunionTable)
    .values({
      id: randomUUID(),
      organizerId,
      name: input?.name ?? "KinCircle Test Reunion",
      description: input?.description ?? "A reunion for test coverage",
      status: input?.status ?? "planning",
    })
    .returning();

  return reunion;
}

export async function createTestHousehold(
  reunionId: string,
  input?: {
    claimedByUserId?: string | null;
    userId?: string | null;
    claimed?: boolean;
    primaryContactName?: string;
    primaryContactEmail?: string;
    rsvpStatus?: "pending" | "yes" | "no" | "maybe";
    invitationStatus?: "not_sent" | "pending" | "accepted" | "revoked" | "expired";
    partySize?: number;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    lat?: number | null;
    lng?: number | null;
  }
) {
  const db = getTestDb();
  const claimedByUserId = input?.claimedByUserId ?? input?.userId ?? null;
  const [household] = await db
    .insert(householdTable)
    .values({
      id: randomUUID(),
      reunionId,
      claimedByUserId,
      claimedAt: input?.claimed && claimedByUserId ? new Date() : null,
      primaryContactName: input?.primaryContactName ?? "Test Household",
      primaryContactEmail:
        input?.primaryContactEmail ?? `household-${randomUUID()}@example.com`,
      invitationStatus: input?.invitationStatus ?? "accepted",
      rsvpStatus: input?.rsvpStatus ?? "yes",
      partySize: input?.partySize ?? 2,
      city: input?.city ?? "Chicago",
      state: input?.state ?? "IL",
      zipCode: input?.zipCode ?? "60601",
      lat: input?.lat ?? 41.8864,
      lng: input?.lng ?? -87.6186,
    })
    .returning();

  return household;
}

export async function createTestInvite(
  reunionId: string,
  input?: {
    email?: string;
    status?: "pending" | "accepted" | "revoked" | "expired";
    expiresAt?: Date;
    householdId?: string | null;
  }
) {
  const db = getTestDb();
  const token = generateToken();
  const [invite] = await db
    .insert(inviteTable)
    .values({
      id: randomUUID(),
      reunionId,
      tokenHash: hashToken(token),
      email: input?.email ?? `invite-${randomUUID()}@example.com`,
      status: input?.status ?? "pending",
      expiresAt:
        input?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      householdId: input?.householdId ?? null,
    })
    .returning();

  return { invite, token };
}

export async function createTestDateOption(
  reunionId: string,
  input?: {
    startDate?: string;
    endDate?: string;
    description?: string | null;
  }
) {
  const db = getTestDb();
  const [dateOption] = await db
    .insert(dateOptionTable)
    .values({
      id: randomUUID(),
      reunionId,
      startDate: input?.startDate ?? "2026-06-12",
      endDate: input?.endDate ?? "2026-06-14",
      description: input?.description ?? "Summer weekend",
    })
    .returning();

  return dateOption;
}

export async function createTestDateVote(
  dateOptionId: string,
  householdId: string,
  vote: "works" | "prefer" | "cannot" = "prefer"
) {
  const db = getTestDb();
  const [dateVote] = await db
    .insert(dateVoteTable)
    .values({
      id: randomUUID(),
      dateOptionId,
      householdId,
      vote,
    })
    .returning();

  return dateVote;
}
