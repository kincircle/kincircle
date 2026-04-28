"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption, dateVote } from "@/db/schema";
import { eq, and, inArray, isNotNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { VotingReminderEmail } from "@/emails/VotingReminderEmail";
import type { VoteChoice } from "@/types";

const MAX_DATE_OPTIONS = 4;

export async function addDateOption(
  reunionId: string,
  data: { startDate: string; endDate: string; description?: string }
): Promise<{ error: string } | { id: string; reunionId: string; startDate: string; endDate: string; description: string | null; createdAt: Date }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const [existing] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));

  if (!existing || existing.organizerId !== session.user.id) {
    return { error: "Forbidden" };
  }

  // Validate dates
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Invalid date format" };
  }
  if (end < start) {
    return { error: "End date must be on or after start date" };
  }

  // Enforce max date options
  const existingOptions = await db
    .select({ id: dateOption.id })
    .from(dateOption)
    .where(eq(dateOption.reunionId, reunionId));

  if (existingOptions.length >= MAX_DATE_OPTIONS) {
    return { error: `Maximum of ${MAX_DATE_OPTIONS} date options allowed` };
  }

  const [newOption] = await db
    .insert(dateOption)
    .values({
      reunionId,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description ?? null,
    })
    .returning();

  revalidatePath(`/reunion/${reunionId}`);
  return newOption;
}

export async function deleteDateOption(
  dateOptionId: string
): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const [option] = await db
    .select()
    .from(dateOption)
    .where(eq(dateOption.id, dateOptionId));

  if (!option) {
    return { error: "Not found" };
  }

  // Verify organizer
  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, option.reunionId));

  if (!reunionRow || reunionRow.organizerId !== session.user.id) {
    return { error: "Forbidden" };
  }

  await db.delete(dateOption).where(eq(dateOption.id, dateOptionId));

  revalidatePath(`/reunion/${option.reunionId}`);
  return { success: true };
}

export async function submitVotes(
  reunionId: string,
  votes: Array<{ dateOptionId: string; vote: VoteChoice }>
): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  // Find household for this user in this reunion
  const [hh] = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, reunionId),
        eq(household.claimedByUserId, session.user.id)
      )
    );

  if (!hh) {
    return { error: "Household not found" };
  }

  if (!hh.claimedAt) {
    return { error: "Household not claimed" };
  }

  // Validate all dateOptionIds belong to this reunion
  if (votes.length > 0) {
    const dateOptionIds = votes.map((v) => v.dateOptionId);
    const validOptions = await db
      .select({ id: dateOption.id })
      .from(dateOption)
      .where(
        and(
          eq(dateOption.reunionId, reunionId),
          inArray(dateOption.id, dateOptionIds)
        )
      );

    const validIds = new Set(validOptions.map((o) => o.id));
    for (const v of votes) {
      if (!validIds.has(v.dateOptionId)) {
        return { error: `Invalid date option: ${v.dateOptionId}` };
      }
    }
  }

  // Upsert each vote
  for (const v of votes) {
    await db
      .insert(dateVote)
      .values({
        dateOptionId: v.dateOptionId,
        householdId: hh.id,
        vote: v.vote,
      })
      .onConflictDoUpdate({
        target: [dateVote.dateOptionId, dateVote.householdId],
        set: { vote: v.vote },
      });
  }

  revalidatePath(`/reunion/${reunionId}`);
  return { success: true };
}

export async function sendVotingReminders(
  reunionId: string
): Promise<{ sent: number }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));

  if (!reunionRow || reunionRow.organizerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  // Get all date option IDs for this reunion
  const options = await db
    .select({ id: dateOption.id })
    .from(dateOption)
    .where(eq(dateOption.reunionId, reunionId));

  const optionIds = options.map((o) => o.id);

  // Get all claimed households
  const claimedHouseholds = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, reunionId),
        sql`${household.claimedAt} IS NOT NULL`,
        isNotNull(household.primaryContactEmail)
      )
    );

  if (optionIds.length === 0 || claimedHouseholds.length === 0) {
    return { sent: 0 };
  }

  // Find households that haven't voted on ALL date options
  const householdsToRemind: typeof claimedHouseholds = [];

  for (const hh of claimedHouseholds) {
    const votedOptions = await db
      .select({ dateOptionId: dateVote.dateOptionId })
      .from(dateVote)
      .where(
        and(
          eq(dateVote.householdId, hh.id),
          inArray(dateVote.dateOptionId, optionIds)
        )
      );

    if (votedOptions.length < optionIds.length) {
      householdsToRemind.push(hh);
    }
  }

  const organizerName = session.user.name ?? "Your family";
  const voteUrl = `${process.env.BETTER_AUTH_URL}/reunion/${reunionId}`;
  let sent = 0;

  for (const hh of householdsToRemind) {
    try {
      if (!hh.primaryContactEmail) {
        continue;
      }

      await sendEmail({
        to: hh.primaryContactEmail,
        subject: `Reminder: Vote on dates for ${reunionRow.name}`,
        react: VotingReminderEmail({
          reunionName: reunionRow.name,
          voteUrl,
          organizerName,
        }),
      });
      sent++;
    } catch (error) {
      console.error(
        `Failed to send reminder to ${hh.primaryContactEmail}:`,
        error
      );
    }
  }

  return { sent };
}
