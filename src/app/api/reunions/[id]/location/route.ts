import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { calculateLocationSuggestion } from "@/lib/location";

const EMPTY_LOCATION_SUMMARY = {
  centerLat: null,
  centerLng: null,
  centerName: null,
  households: [],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch reunion
  const [reunionRow] = await db.select().from(reunion).where(eq(reunion.id, id));
  if (!reunionRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Auth: organizer OR claimed household
  const isOrganizer = reunionRow.organizerId === session.user.id;
  if (!isOrganizer) {
    const [hh] = await db
      .select()
      .from(household)
      .where(and(eq(household.reunionId, id), eq(household.claimedByUserId, session.user.id)));
    if (!hh) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch households with valid coordinates
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

  // If no households with coordinates, return empty result
  if (households.length === 0) {
    return NextResponse.json(EMPTY_LOCATION_SUMMARY);
  }

  // Map to HouseholdLocation array
  const householdLocations = households.map((hh) => ({
    lat: hh.lat!,
    lng: hh.lng!,
    partySize: hh.partySize,
    householdId: hh.id,
    primaryContactName: hh.primaryContactName,
  }));

  // Call calculateLocationSuggestion
  const suggestion = await calculateLocationSuggestion(householdLocations);

  // Return result or empty if calculation failed
  if (!suggestion) {
    return NextResponse.json(EMPTY_LOCATION_SUMMARY);
  }

  return NextResponse.json(suggestion);
}
