"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { household, potluckItem, reunion } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { PotluckItem } from "@/types";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireOrganizer(reunionId: string) {
  const session = await requireSession();

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

export async function addPotluckItem(input: {
  reunionId: string;
  name: string;
  notes?: string | null;
}): Promise<PotluckItem> {
  const { session } = await requireOrganizer(input.reunionId);

  const name = input.name.trim();
  if (!name) {
    throw new Error("name is required");
  }

  const [created] = await db
    .insert(potluckItem)
    .values({
      reunionId: input.reunionId,
      name,
      notes: input.notes?.trim() || null,
      createdByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .returning();

  revalidatePath(`/reunion/${input.reunionId}/plan`);
  return created;
}

export async function deletePotluckItem(input: {
  itemId: string;
}): Promise<void> {
  const session = await requireSession();

  const [item] = await db
    .select()
    .from(potluckItem)
    .where(eq(potluckItem.id, input.itemId));

  if (!item) {
    throw new Error("Not found");
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, item.reunionId));

  if (!reunionRow) {
    throw new Error("Not found");
  }

  if (reunionRow.organizerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await db.delete(potluckItem).where(eq(potluckItem.id, input.itemId));

  revalidatePath(`/reunion/${item.reunionId}/plan`);
}

export async function claimPotluckItem(input: {
  itemId: string;
  householdId: string;
}): Promise<PotluckItem> {
  const session = await requireSession();

  const [householdRow] = await db
    .select()
    .from(household)
    .where(eq(household.id, input.householdId));

  if (!householdRow) {
    throw new Error("Not found");
  }

  if (householdRow.claimedByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }

  const [item] = await db
    .select()
    .from(potluckItem)
    .where(eq(potluckItem.id, input.itemId));

  if (!item) {
    throw new Error("Not found");
  }

  if (
    item.claimedByHouseholdId &&
    item.claimedByHouseholdId !== input.householdId
  ) {
    throw new Error("Already claimed by another household");
  }

  const [updated] = await db
    .update(potluckItem)
    .set({
      claimedByHouseholdId: input.householdId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(potluckItem.id, input.itemId))
    .returning();

  revalidatePath(`/reunion/${item.reunionId}/plan`);
  return updated;
}

export async function unclaimPotluckItem(input: {
  itemId: string;
}): Promise<PotluckItem> {
  const session = await requireSession();

  const [item] = await db
    .select()
    .from(potluckItem)
    .where(eq(potluckItem.id, input.itemId));

  if (!item) {
    throw new Error("Not found");
  }

  // Check if caller is the organizer
  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, item.reunionId));

  if (!reunionRow) {
    throw new Error("Not found");
  }

  const isOrganizer = reunionRow.organizerId === session.user.id;

  if (!isOrganizer) {
    // Caller must own the household that currently holds the claim
    if (!item.claimedByHouseholdId) {
      throw new Error("Forbidden");
    }

    const [claimingHousehold] = await db
      .select()
      .from(household)
      .where(
        and(
          eq(household.id, item.claimedByHouseholdId),
          eq(household.claimedByUserId, session.user.id)
        )
      );

    if (!claimingHousehold) {
      throw new Error("Forbidden");
    }
  }

  const [updated] = await db
    .update(potluckItem)
    .set({
      claimedByHouseholdId: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(potluckItem.id, input.itemId))
    .returning();

  revalidatePath(`/reunion/${item.reunionId}/plan`);
  return updated;
}
