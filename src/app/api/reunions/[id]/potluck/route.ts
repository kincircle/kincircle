import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { household, potluckItem, reunion } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const MAX_ITEM_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 240;

type PotluckAction = "create" | "claim" | "release";

function normalizeItemName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_ITEM_NAME_LENGTH) return null;
  return trimmed;
}

function normalizeNotes(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > MAX_NOTES_LENGTH) return null;
  return trimmed || null;
}

function isPotluckAction(value: unknown): value is PotluckAction {
  return value === "create" || value === "claim" || value === "release";
}

async function getAccess(reunionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));

  if (!reunionRow) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const [currentHousehold] = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, reunionId),
        eq(household.claimedByUserId, session.user.id)
      )
    );

  if (reunionRow.organizerId !== session.user.id && !currentHousehold) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    session,
    reunion: reunionRow,
    currentHousehold: currentHousehold ?? null,
    isOrganizer: reunionRow.organizerId === session.user.id,
  };
}

async function selectPotluckItems(reunionId: string) {
  const rows = await db
    .select({
      id: potluckItem.id,
      reunionId: potluckItem.reunionId,
      name: potluckItem.name,
      notes: potluckItem.notes,
      claimedByHouseholdId: potluckItem.claimedByHouseholdId,
      claimedByHouseholdName: household.primaryContactName,
      createdByUserId: potluckItem.createdByUserId,
      createdAt: potluckItem.createdAt,
      updatedAt: potluckItem.updatedAt,
    })
    .from(potluckItem)
    .leftJoin(household, eq(potluckItem.claimedByHouseholdId, household.id))
    .where(eq(potluckItem.reunionId, reunionId))
    .orderBy(asc(potluckItem.createdAt));

  return rows;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await getAccess(id);
  if ("error" in access) return access.error;

  const items = await selectPotluckItems(id);

  return NextResponse.json({
    items,
    currentHouseholdId: access.currentHousehold?.id ?? null,
    canClaim: Boolean(access.currentHousehold),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await getAccess(id);
  if ("error" in access) return access.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload.action;
  if (!isPotluckAction(action)) {
    return NextResponse.json(
      { error: "action must be create, claim, or release" },
      { status: 400 }
    );
  }

  const itemId = typeof payload.itemId === "string" ? payload.itemId : null;
  const name = normalizeItemName(payload.name);
  const notes = normalizeNotes(payload.notes);

  if ((action === "create" || !itemId) && !name) {
    return NextResponse.json(
      { error: "name is required and must be 120 characters or fewer" },
      { status: 400 }
    );
  }

  if (payload.notes !== undefined && notes === null && payload.notes !== "") {
    return NextResponse.json(
      { error: "notes must be 240 characters or fewer" },
      { status: 400 }
    );
  }

  if ((action === "claim" || action === "release") && !access.currentHousehold) {
    return NextResponse.json(
      { error: "Only a claimed household can claim potluck items" },
      { status: 403 }
    );
  }

  const item = await db.transaction(async (tx) => {
    let target = null as typeof potluckItem.$inferSelect | null;

    if (itemId) {
      const [existing] = await tx
        .select()
        .from(potluckItem)
        .where(and(eq(potluckItem.id, itemId), eq(potluckItem.reunionId, id)));
      target = existing ?? null;
    }

    if (!target && name) {
      const [existing] = await tx
        .select()
        .from(potluckItem)
        .where(and(eq(potluckItem.reunionId, id), eq(potluckItem.name, name)));

      if (existing) {
        target = existing;
      } else {
        const [created] = await tx
          .insert(potluckItem)
          .values({
            reunionId: id,
            name,
            notes,
            createdByUserId: access.session.user.id,
            updatedAt: new Date(),
          })
          .returning();
        target = created;
      }
    }

    if (!target) return null;

    if (action === "create") return target;

    if (action === "claim") {
      if (
        target.claimedByHouseholdId &&
        target.claimedByHouseholdId !== access.currentHousehold?.id
      ) {
        throw new Error("claimed");
      }

      const [claimed] = await tx
        .update(potluckItem)
        .set({
          claimedByHouseholdId: access.currentHousehold?.id,
          updatedAt: new Date(),
        })
        .where(eq(potluckItem.id, target.id))
        .returning();
      return claimed;
    }

    if (
      target.claimedByHouseholdId !== access.currentHousehold?.id &&
      !access.isOrganizer
    ) {
      throw new Error("forbidden");
    }

    const [released] = await tx
      .update(potluckItem)
      .set({ claimedByHouseholdId: null, updatedAt: new Date() })
      .where(eq(potluckItem.id, target.id))
      .returning();
    return released;
  }).catch((error: unknown) => {
    if (error instanceof Error) return error;
    return new Error("unknown");
  });

  if (item instanceof Error) {
    if (item.message === "claimed") {
      return NextResponse.json(
        { error: "This potluck item has already been claimed" },
        { status: 409 }
      );
    }
    if (item.message === "forbidden") {
      return NextResponse.json(
        { error: "Only the claiming household can release this item" },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Could not update potluck item" }, { status: 500 });
  }

  if (!item) {
    return NextResponse.json({ error: "Potluck item not found" }, { status: 404 });
  }

  const [itemWithHousehold] = (await selectPotluckItems(id)).filter(
    (row) => row.id === item.id
  );

  return NextResponse.json({ item: itemWithHousehold ?? item });
}
