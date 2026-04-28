import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Reunions where user is organizer
  const organized = await db
    .select()
    .from(reunion)
    .where(eq(reunion.organizerId, userId))
    .orderBy(desc(reunion.createdAt));

  // Reunions where user has a claimed household
  const memberOfRows = await db
    .select({ reunion })
    .from(reunion)
    .innerJoin(
      household,
      and(eq(household.reunionId, reunion.id), eq(household.claimedByUserId, userId))
    )
    .orderBy(desc(reunion.createdAt));

  const memberOf = memberOfRows.map((row) => row.reunion);

  // Deduplicate: remove from memberOf any that are already in organized
  const organizedIds = new Set(organized.map((r) => r.id));
  const uniqueMemberOf = memberOf.filter((r) => !organizedIds.has(r.id));

  return NextResponse.json({ organized, memberOf: uniqueMemberOf });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body as {
    name?: string;
    description?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const [newReunion] = await db
    .insert(reunion)
    .values({
      name: name.trim(),
      description: description ?? null,
      organizerId: session.user.id,
    })
    .returning();

  return NextResponse.json(newReunion, { status: 201 });
}
