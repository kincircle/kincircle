import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reunion, household, householdMember } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

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
    .where(
      and(eq(reunion.id, id), eq(reunion.organizerId, session.user.id))
    );

  if (!reunionRow) {
    return NextResponse.json(
      { error: "Reunion not found or not authorized" },
      { status: 404 }
    );
  }

  const households = await db
    .select()
    .from(household)
    .where(eq(household.reunionId, id));

  const householdsWithMembers = await Promise.all(
    households.map(async (h) => {
      const members = await db
        .select()
        .from(householdMember)
        .where(eq(householdMember.householdId, h.id));

      return { ...h, members };
    })
  );

  return NextResponse.json(householdsWithMembers);
}
