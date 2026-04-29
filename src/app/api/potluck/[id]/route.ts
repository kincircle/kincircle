import { NextResponse } from "next/server";
import {
  claimPotluckItem,
  deletePotluckItem,
  unclaimPotluckItem,
} from "@/lib/actions/potluck";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  if (action !== "claim" && action !== "unclaim") {
    return NextResponse.json(
      { error: "action must be 'claim' or 'unclaim'" },
      { status: 400 }
    );
  }

  try {
    if (action === "claim") {
      const householdId =
        typeof payload.householdId === "string" ? payload.householdId : null;
      if (!householdId) {
        return NextResponse.json(
          { error: "householdId is required for claim" },
          { status: 400 }
        );
      }

      const item = await claimPotluckItem({ itemId: id, householdId });
      return NextResponse.json({ item });
    }

    // action === "unclaim"
    const item = await unclaimPotluckItem({ itemId: id });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message === "Not found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (error.message === "Already claimed by another household") {
        return NextResponse.json(
          { error: "This potluck item has already been claimed" },
          { status: 409 }
        );
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deletePotluckItem({ itemId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message === "Not found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
