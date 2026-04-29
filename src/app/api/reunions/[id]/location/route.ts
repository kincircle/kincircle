import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { calculateLocationSuggestion } from "@/lib/location";

const EMPTY_LOCATION_SUMMARY = {
  centerLat: null,
  centerLng: null,
  centerName: null,
  lockedLocationName: null,
  lockedLocationLat: null,
  lockedLocationLng: null,
  households: [],
};

function withLockedLocation(
  summary: {
    centerLat: number | null;
    centerLng: number | null;
    centerName: string | null;
    households: {
      householdId: string;
      primaryContactName: string;
      distanceMiles: number;
      estimatedDriveHours: number;
    }[];
  },
  reunionRow: typeof reunion.$inferSelect
) {
  return {
    ...summary,
    lockedLocationName: reunionRow.lockedLocationName,
    lockedLocationLat: reunionRow.lockedLocationLat,
    lockedLocationLng: reunionRow.lockedLocationLng,
  };
}

function parseCoordinate(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { error: `${field} must be a number` };
  }
  return value;
}

function validateCoordinates(lat: unknown, lng: unknown) {
  const locationLat = parseCoordinate(lat, "locationLat");
  if (typeof locationLat === "object" && locationLat !== null) return locationLat;
  const locationLng = parseCoordinate(lng, "locationLng");
  if (typeof locationLng === "object" && locationLng !== null) return locationLng;

  if ((locationLat === null) !== (locationLng === null)) {
    return { error: "locationLat and locationLng must be provided together" };
  }
  if (locationLat !== null && (locationLat < -90 || locationLat > 90)) {
    return { error: "locationLat must be between -90 and 90" };
  }
  if (locationLng !== null && (locationLng < -180 || locationLng > 180)) {
    return { error: "locationLng must be between -180 and 180" };
  }

  return { locationLat, locationLng };
}

async function getAuthorizedReunion(reunionId: string, organizerOnly = false) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const [reunionRow] = await db.select().from(reunion).where(eq(reunion.id, reunionId));
  if (!reunionRow) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const isOrganizer = reunionRow.organizerId === session.user.id;
  if (organizerOnly && !isOrganizer) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (!organizerOnly && !isOrganizer) {
    const [hh] = await db
      .select()
      .from(household)
      .where(and(eq(household.reunionId, reunionId), eq(household.claimedByUserId, session.user.id)));
    if (!hh) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { session, reunionRow };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await getAuthorizedReunion(id);
  if ("error" in access) return access.error;

  const households = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, id),
        isNotNull(household.lat),
        isNotNull(household.lng)
      )
    );

  if (households.length === 0) {
    return NextResponse.json(withLockedLocation(EMPTY_LOCATION_SUMMARY, access.reunionRow));
  }

  const householdLocations = households.map((hh) => ({
    lat: hh.lat!,
    lng: hh.lng!,
    partySize: hh.partySize,
    householdId: hh.id,
    primaryContactName: hh.primaryContactName,
  }));

  const suggestion = await calculateLocationSuggestion(householdLocations);

  if (!suggestion) {
    return NextResponse.json(withLockedLocation(EMPTY_LOCATION_SUMMARY, access.reunionRow));
  }

  return NextResponse.json(withLockedLocation(suggestion, access.reunionRow));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await getAuthorizedReunion(id, true);
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
  if (typeof payload.locationName !== "string") {
    return NextResponse.json({ error: "locationName is required" }, { status: 400 });
  }

  const locationName = payload.locationName.trim();
  if (!locationName || locationName.length > 240) {
    return NextResponse.json(
      { error: "locationName must be between 1 and 240 characters" },
      { status: 400 }
    );
  }

  const coordinates = validateCoordinates(payload.locationLat, payload.locationLng);
  if ("error" in coordinates) {
    return NextResponse.json({ error: coordinates.error }, { status: 400 });
  }

  const [updated] = await db
    .update(reunion)
    .set({
      lockedLocationName: locationName,
      lockedLocationLat: coordinates.locationLat,
      lockedLocationLng: coordinates.locationLng,
      updatedAt: new Date(),
    })
    .where(eq(reunion.id, id))
    .returning({
      lockedLocationName: reunion.lockedLocationName,
      lockedLocationLat: reunion.lockedLocationLat,
      lockedLocationLng: reunion.lockedLocationLng,
    });

  revalidatePath(`/reunion/${id}`);
  revalidatePath(`/reunion/${id}/plan`);
  revalidatePath("/dashboard");

  return NextResponse.json(updated);
}
