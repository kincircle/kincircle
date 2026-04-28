interface HouseholdLocation {
  lat: number;
  lng: number;
  partySize: number;
  householdId: string;
  primaryContactName: string;
}

interface LocationSuggestion {
  centerLat: number;
  centerLng: number;
  centerName: string | null;
  households: {
    householdId: string;
    primaryContactName: string;
    distanceMiles: number;
    estimatedDriveHours: number;
  }[];
}

export function calculateWeightedMidpoint(households: HouseholdLocation[]): { lat: number; lng: number } | null {
  if (households.length === 0) return null;

  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;

  for (const h of households) {
    weightedLat += h.lat * h.partySize;
    weightedLng += h.lng * h.partySize;
    totalWeight += h.partySize;
  }

  if (totalWeight === 0) return null;

  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight,
  };
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function estimateDriveTime(distanceMiles: number): number {
  // Rough estimate: straight-line * 1.3 correction factor / 55 mph
  return (distanceMiles * 1.3) / 55;
}

export async function calculateLocationSuggestion(households: HouseholdLocation[]): Promise<LocationSuggestion | null> {
  if (households.length === 0) return null;

  const midpoint = calculateWeightedMidpoint(households);
  if (!midpoint) return null;

  // Dynamic import to keep this usable server-side only
  const { reverseGeocode } = await import("@/lib/geocode");
  const centerName = await reverseGeocode(midpoint.lat, midpoint.lng);

  const householdDistances = households.map((h) => {
    const distanceMiles = haversineDistance(midpoint.lat, midpoint.lng, h.lat, h.lng);
    return {
      householdId: h.householdId,
      primaryContactName: h.primaryContactName,
      distanceMiles: Math.round(distanceMiles),
      estimatedDriveHours: Math.round(estimateDriveTime(distanceMiles) * 10) / 10,
    };
  });

  return {
    centerLat: midpoint.lat,
    centerLng: midpoint.lng,
    centerName,
    households: householdDistances,
  };
}
