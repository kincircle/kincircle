import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const MAX_DATE_OPTIONS = 4;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Check if user is organizer or has a claimed household
  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!reunionRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOrganizer = reunionRow.organizerId === session.user.id;

  if (!isOrganizer) {
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
  }

  const options = await db
    .select()
    .from(dateOption)
    .where(eq(dateOption.reunionId, id))
    .orderBy(asc(dateOption.startDate));

  return NextResponse.json(options);
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

  // Organizer-only
  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(and(eq(reunion.id, id), eq(reunion.organizerId, session.user.id)));

  if (!reunionRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { startDate, endDate, description } = body;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format" },
      { status: 400 }
    );
  }
  if (end < start) {
    return NextResponse.json(
      { error: "End date must be on or after start date" },
      { status: 400 }
    );
  }

  // Enforce max date options
  const existingOptions = await db
    .select({ id: dateOption.id })
    .from(dateOption)
    .where(eq(dateOption.reunionId, id));

  if (existingOptions.length >= MAX_DATE_OPTIONS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_DATE_OPTIONS} date options allowed` },
      { status: 400 }
    );
  }

  const [newOption] = await db
    .insert(dateOption)
    .values({
      reunionId: id,
      startDate,
      endDate,
      description: description ?? null,
    })
    .returning();

  return NextResponse.json({ dateOption: newOption }, { status: 201 });
}
