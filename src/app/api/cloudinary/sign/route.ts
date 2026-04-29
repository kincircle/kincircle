import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signUploadParams } from "@/lib/cloudinary";
import { household, reunion } from "@/db/schema";

export const runtime = "nodejs";

const allowedPurposes = new Set(["hero", "date-options", "photos"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUploadFolder(folder: unknown):
  | {
      folder: string;
      reunionId: string;
      purpose: string;
    }
  | undefined {
  if (typeof folder !== "string") return undefined;

  const normalized = folder.trim().replace(/\/+$/, "");
  const parts = normalized.split("/");
  if (parts.length !== 3) return undefined;

  const [root, reunionId, purpose] = parts;

  if (
    root !== "kincircle" ||
    !uuidPattern.test(reunionId) ||
    !purpose ||
    !allowedPurposes.has(purpose)
  ) {
    return undefined;
  }

  return { folder: normalized, reunionId, purpose };
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const folder = parseUploadFolder(
    typeof body === "object" && body !== null && "folder" in body
      ? (body as { folder?: unknown }).folder
      : undefined
  );

  if (!folder) {
    return NextResponse.json(
      { error: "folder must match kincircle/{reunionId}/{hero|date-options|photos}" },
      { status: 400 }
    );
  }

  const [found] = await db
    .select({ organizerId: reunion.organizerId })
    .from(reunion)
    .where(eq(reunion.id, folder.reunionId));

  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOrganizer = found.organizerId === session.user.id;
  if (folder.purpose === "hero" && !isOrganizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isOrganizer) {
    const [claimedHousehold] = await db
      .select({ id: household.id })
      .from(household)
      .where(
        and(
          eq(household.reunionId, folder.reunionId),
          eq(household.claimedByUserId, session.user.id)
        )
      );

    if (!claimedHousehold) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json(signUploadParams({ folder: folder.folder }));
}
