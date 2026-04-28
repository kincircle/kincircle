import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, reunionUpdate } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));
  if (!reunionRow)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOrganizer = reunionRow.organizerId === session.user.id;
  if (!isOrganizer) {
    const [hh] = await db
      .select()
      .from(household)
      .where(
        and(eq(household.reunionId, id), eq(household.claimedByUserId, session.user.id))
      );
    if (!hh)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates = await db
    .select()
    .from(reunionUpdate)
    .where(eq(reunionUpdate.reunionId, id))
    .orderBy(desc(reunionUpdate.createdAt));

  return NextResponse.json(updates);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));
  if (!reunionRow)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (reunionRow.organizerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { title, message } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(reunionUpdate)
    .values({
      reunionId: id,
      title: title.trim(),
      message: message.trim(),
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
