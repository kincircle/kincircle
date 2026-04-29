import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signUploadParams, type SignUploadParams } from "@/lib/cloudinary";
import { household, reunion } from "@/db/schema";

export const runtime = "nodejs";

const uploadPurposes = ["hero", "date-options", "photos"] as const;
type UploadPurpose = (typeof uploadPurposes)[number];
type ParsedUploadFolder = {
  folder: string;
  reunionId: string;
  purpose: UploadPurpose;
};

const allowedPurposes = new Set<UploadPurpose>(uploadPurposes);
const organizerOnlyPurposes = new Set<UploadPurpose>(["hero", "date-options"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUploadPurpose(purpose: string): purpose is UploadPurpose {
  return allowedPurposes.has(purpose as UploadPurpose);
}

function isSignableValue(
  value: unknown
): value is string | number | boolean | string[] | undefined {
  return (
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function parseSignUploadParams(
  body: unknown
):
  | {
      folder: ParsedUploadFolder;
      paramsToSign: SignUploadParams;
    }
  | undefined {
  const bodyRecord = readObject(body);
  if (!bodyRecord) return undefined;

  const rawParams =
    readObject(bodyRecord.paramsToSign) ??
    (typeof bodyRecord.folder === "string" ? { folder: bodyRecord.folder } : undefined);

  if (!rawParams) return undefined;

  const folder = parseUploadFolder(rawParams.folder);
  if (!folder) return undefined;

  const paramsToSign: SignUploadParams = { folder: folder.folder };
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === "folder") continue;
    if (!isSignableValue(value)) return undefined;
    if (value !== undefined) {
      paramsToSign[key] = value;
    }
  }

  return { folder, paramsToSign };
}

function parseUploadFolder(folder: unknown): ParsedUploadFolder | undefined {
  if (typeof folder !== "string") return undefined;

  const normalized = folder.trim().replace(/\/+$/, "");
  const parts = normalized.split("/");
  if (parts.length !== 3) return undefined;

  const [root, reunionId, purpose] = parts;

  if (root !== "kincircle" || !uuidPattern.test(reunionId)) {
    return undefined;
  }

  if (!isUploadPurpose(purpose)) {
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

  const upload = parseSignUploadParams(body);

  if (!upload) {
    return NextResponse.json(
      { error: "folder must match kincircle/{reunionId}/{hero|date-options|photos}" },
      { status: 400 }
    );
  }

  const [found] = await db
    .select({ organizerId: reunion.organizerId })
    .from(reunion)
    .where(eq(reunion.id, upload.folder.reunionId));

  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOrganizer = found.organizerId === session.user.id;
  if (organizerOnlyPurposes.has(upload.folder.purpose) && !isOrganizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isOrganizer) {
    const [claimedHousehold] = await db
      .select({ id: household.id })
      .from(household)
      .where(
        and(
          eq(household.reunionId, upload.folder.reunionId),
          eq(household.claimedByUserId, session.user.id)
        )
      );

    if (!claimedHousehold) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json(signUploadParams(upload.paramsToSign));
}
