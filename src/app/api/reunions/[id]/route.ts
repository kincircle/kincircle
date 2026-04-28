import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [found] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check authorization: organizer or household member
  if (found.organizerId !== session.user.id) {
    const [memberHousehold] = await db
      .select()
      .from(household)
      .where(
        and(
          eq(household.reunionId, id),
          eq(household.claimedByUserId, session.user.id)
        )
      );

    if (!memberHousehold) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(found);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [found] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (found.organizerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description } = body as {
    name?: string;
    description?: string;
  };

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description;

  const [updated] = await db
    .update(reunion)
    .set(updateData)
    .where(eq(reunion.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [found] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (found.organizerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only allow deletion when status is "planning"
  if (found.status !== "planning") {
    return NextResponse.json(
      { error: "Can only delete reunions in planning status" },
      { status: 400 }
    );
  }

  await db.delete(reunion).where(eq(reunion.id, id));

  return new NextResponse(null, { status: 204 });
}
