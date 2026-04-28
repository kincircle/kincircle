import { getMapboxAccessToken } from "@/lib/env";

export interface GeocodingResult {
  lat: number;
  lng: number;
  placeName: string;
}

function isExternalServiceTestMode() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.KINCIRCLE_TEST_MODE === "1"
  );
}

function hashString(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function deterministicCoordinate(input: string, min: number, max: number) {
  const ratio = hashString(input) / 0xffffffff;
  return min + (max - min) * ratio;
}

function getTestGeocodeResult(
  city: string,
  state: string,
  zipCode: string
): GeocodingResult {
  const key = `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}|${zipCode.trim()}`;
  return {
    lat: Number(deterministicCoordinate(`${key}:lat`, 25, 48).toFixed(6)),
    lng: Number(deterministicCoordinate(`${key}:lng`, -124, -67).toFixed(6)),
    placeName: `${city}, ${state} ${zipCode}`,
  };
}

export async function geocodeAddress(city: string, state: string, zipCode: string): Promise<GeocodingResult | null> {
  if (isExternalServiceTestMode()) {
    return getTestGeocodeResult(city, state, zipCode);
  }

  const accessToken = getMapboxAccessToken();
  if (!accessToken) {
    console.warn("Skipping geocoding because MAPBOX_ACCESS_TOKEN is not configured.");
    return null;
  }

  const query = encodeURIComponent(`${city}, ${state} ${zipCode}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${accessToken}&country=US&types=place,postcode&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - could implement retry, for now just return null
        console.warn("Mapbox rate limited");
      }
      console.error("Mapbox geocoding error:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return null;
    }

    const [lng, lat] = data.features[0].center;
    return { lat, lng, placeName: data.features[0].place_name };
  } catch (error) {
    console.error("Geocoding exception:", error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (isExternalServiceTestMode()) {
    return `Test meeting point (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
  }

  const accessToken = getMapboxAccessToken();
  if (!accessToken) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}&types=place&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    return data.features[0].place_name;
  } catch (error) {
    console.error("Reverse geocoding exception:", error);
    return null;
  }
}
