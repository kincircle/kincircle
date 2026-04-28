import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption, dateVote } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { VoteChoice } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!reunionRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOrganizer = reunionRow.organizerId === session.user.id;

  // Get all date options for this reunion
  const options = await db
    .select()
    .from(dateOption)
    .where(eq(dateOption.reunionId, id));

  if (isOrganizer) {
    // Organizer sees all votes grouped by date option with tallies
    const optionIds = options.map((o) => o.id);

    let allVotes: Array<{
      dateOptionId: string;
      vote: string;
    }> = [];

    if (optionIds.length > 0) {
      allVotes = await db
        .select({
          dateOptionId: dateVote.dateOptionId,
          vote: dateVote.vote,
        })
        .from(dateVote)
        .where(inArray(dateVote.dateOptionId, optionIds));
    }

    const dateOptions = options.map((opt) => {
      const optionVotes = allVotes.filter(
        (v) => v.dateOptionId === opt.id
      );
      const tally = {
        works: optionVotes.filter((v) => v.vote === "works").length,
        prefer: optionVotes.filter((v) => v.vote === "prefer").length,
        cannot: optionVotes.filter((v) => v.vote === "cannot").length,
        total: optionVotes.length,
      };
      return {
        id: opt.id,
        startDate: opt.startDate,
        endDate: opt.endDate,
        description: opt.description,
        votes: tally,
      };
    });

    return NextResponse.json({ dateOptions });
  }

  // Household member sees only their own votes
  const [hh] = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, id),
        eq(household.claimedByUserId, session.user.id),
        sql`${household.claimedAt} IS NOT NULL`
      )
    );

  if (!hh) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const optionIds = options.map((o) => o.id);
  let householdVotes: Array<{
    dateOptionId: string;
    vote: string;
  }> = [];

  if (optionIds.length > 0) {
    householdVotes = await db
      .select({
        dateOptionId: dateVote.dateOptionId,
        vote: dateVote.vote,
      })
      .from(dateVote)
      .where(
        and(
          eq(dateVote.householdId, hh.id),
          inArray(dateVote.dateOptionId, optionIds)
        )
      );
  }

  return NextResponse.json({
    householdId: hh.id,
    votes: householdVotes,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // User must have a claimed household in this reunion
  const [hh] = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, id),
        eq(household.claimedByUserId, session.user.id),
        sql`${household.claimedAt} IS NOT NULL`
      )
    );

  if (!hh) {
    return NextResponse.json(
      { error: "No claimed household found" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { votes } = body as {
    votes: Array<{ dateOptionId: string; vote: VoteChoice }>;
  };

  if (!Array.isArray(votes)) {
    return NextResponse.json(
      { error: "votes must be an array" },
      { status: 400 }
    );
  }

  // Validate vote values
  const validVotes: VoteChoice[] = ["works", "prefer", "cannot"];
  for (const v of votes) {
    if (!v.dateOptionId || !validVotes.includes(v.vote)) {
      return NextResponse.json(
        { error: `Invalid vote: dateOptionId and vote (works/prefer/cannot) required` },
        { status: 400 }
      );
    }
  }

  // Validate all dateOptionIds belong to this reunion
  if (votes.length > 0) {
    const dateOptionIds = votes.map((v) => v.dateOptionId);
    const validOptions = await db
      .select({ id: dateOption.id })
      .from(dateOption)
      .where(
        and(
          eq(dateOption.reunionId, id),
          inArray(dateOption.id, dateOptionIds)
        )
      );

    const validIds = new Set(validOptions.map((o) => o.id));
    for (const v of votes) {
      if (!validIds.has(v.dateOptionId)) {
        return NextResponse.json(
          { error: `Invalid date option: ${v.dateOptionId}` },
          { status: 400 }
        );
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

  return NextResponse.json({ success: true });
}
