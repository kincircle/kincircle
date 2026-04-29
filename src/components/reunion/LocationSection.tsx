"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ExternalLink, Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { expectArrayField, expectRecord } from "@/lib/response";

interface LocationSectionProps {
  reunionId: string;
  isOrganizer?: boolean;
}

interface LocationData {
  centerLat: number | null;
  centerLng: number | null;
  centerName: string | null;
  lockedLocationName: string | null;
  lockedLocationLat: number | null;
  lockedLocationLng: number | null;
  households: {
    householdId: string;
    primaryContactName: string;
    distanceMiles: number;
    estimatedDriveHours: number;
  }[];
}

function formatDriveTime(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 min";
  if (hours < 1) return `${Math.round(hours * 60)} min`;

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) {
    return `${wholeHours} hr${wholeHours === 1 ? "" : "s"}`;
  }
  return `${wholeHours} hr ${minutes} min`;
}

function averageDriveTime(households: LocationData["households"]): number {
  if (households.length === 0) return 0;
  const total = households.reduce(
    (sum, household) => sum + household.estimatedDriveHours,
    0
  );
  return total / households.length;
}

function householdInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "HH";
}

function coordinatesLabel(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return null;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function mapsHref(name: string | null, lat: number | null, lng: number | null): string | null {
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  }
  return null;
}

export function LocationSection({
  reunionId,
  isOrganizer = false,
}: LocationSectionProps) {
  const router = useRouter();
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [knownLocationName, setKnownLocationName] = useState("");

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reunions/${reunionId}/location`);
      if (!res.ok) {
        throw new Error("Failed to fetch location");
      }

      const json = expectRecord(await res.json(), "reunion location summary");
      const households = expectArrayField<LocationData["households"][number]>(
        json,
        "households",
        "reunion location summary"
      );

      const nextData = {
        centerLat: typeof json.centerLat === "number" ? json.centerLat : null,
        centerLng: typeof json.centerLng === "number" ? json.centerLng : null,
        centerName: typeof json.centerName === "string" ? json.centerName : null,
        lockedLocationName:
          typeof json.lockedLocationName === "string"
            ? json.lockedLocationName
            : null,
        lockedLocationLat:
          typeof json.lockedLocationLat === "number"
            ? json.lockedLocationLat
            : null,
        lockedLocationLng:
          typeof json.lockedLocationLng === "number"
            ? json.lockedLocationLng
            : null,
        households,
      };
      setData(nextData);
      setKnownLocationName(nextData.lockedLocationName ?? "");
    } catch (error) {
      toast.error("Failed to load location data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [reunionId]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  async function saveLocation(
    locationName: string,
    locationLat: number | null,
    locationLng: number | null
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/reunions/${reunionId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationName, locationLat, locationLng }),
      });
      const json = expectRecord(await res.json(), "saved reunion location");
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Failed to save location"
        );
      }

      const nextLocationName =
        typeof json.lockedLocationName === "string"
          ? json.lockedLocationName
          : locationName;
      const nextLocationLat =
        typeof json.lockedLocationLat === "number" ? json.lockedLocationLat : null;
      const nextLocationLng =
        typeof json.lockedLocationLng === "number" ? json.lockedLocationLng : null;

      setKnownLocationName(nextLocationName);
      setData((prev) =>
        prev
          ? {
              ...prev,
              lockedLocationName: nextLocationName,
              lockedLocationLat: nextLocationLat,
              lockedLocationLng: nextLocationLng,
            }
          : prev
      );
      toast.success("Location saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  async function handleKnownLocationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const locationName = knownLocationName.trim();
    if (!locationName) {
      toast.error("Enter a location first");
      return;
    }
    await saveLocation(locationName, null, null);
  }

  async function handleUseSuggestion() {
    if (!suggestion) return;
    const { centerLat, centerLng } = suggestion;
    if (centerLat === null || centerLng === null) return;
    await saveLocation(
      suggestion.centerName ??
        `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`,
      centerLat,
      centerLng
    );
  }

  const suggestion =
    !loading &&
    data &&
    data.centerLat !== null &&
    data.centerLng !== null &&
    data.households.length > 0
      ? data
      : null;
  const lockedLocation =
    data?.lockedLocationName && data.lockedLocationName.trim().length > 0
      ? data
      : null;
  const sortedHouseholds = data
    ? [...data.households].sort((a, b) => b.distanceMiles - a.distanceMiles)
    : [];
  const averageDrive = data ? averageDriveTime(data.households) : 0;
  const farthestDistance = sortedHouseholds[0]?.distanceMiles ?? 0;
  const suggestionName = suggestion?.centerName ?? "Suggested midpoint";
  const suggestionCoordinates = suggestion
    ? coordinatesLabel(suggestion.centerLat, suggestion.centerLng)
    : null;
  const lockedCoordinates = lockedLocation
    ? coordinatesLabel(
        lockedLocation.lockedLocationLat,
        lockedLocation.lockedLocationLng
      )
    : null;
  const lockedMapHref = lockedLocation
    ? mapsHref(
        lockedLocation.lockedLocationName,
        lockedLocation.lockedLocationLat,
        lockedLocation.lockedLocationLng
      )
    : null;

  return (
    <div className="card space-y-6">
      <div className="between flex-col items-start sm:flex-row sm:items-start">
        <div>
          <span className="section-eyebrow">Step 3</span>
          <div className="row">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xl">Choose a location</h3>
              <p className="muted text-sm">
                Save a known place now, or use the centered suggestion.
              </p>
            </div>
          </div>
        </div>
        {data && data.households.length > 0 && (
          <span className="badge muted">
            {data.households.length} household
            {data.households.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading && (
        <div className="muted flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading location data...</span>
        </div>
      )}

      {!loading && isOrganizer && (
        <form className="space-y-3" onSubmit={handleKnownLocationSubmit}>
          <div>
            <label className="label" htmlFor="known-location">
              Known location
            </label>
            <input
              id="known-location"
              className="input"
              value={knownLocationName}
              onChange={(event) => setKnownLocationName(event.target.value)}
              placeholder="Lake Anna State Park - Pavilion B"
              maxLength={240}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="muted text-sm">
              Save the venue or address you already know. Suggestions stay optional.
            </p>
            <button
              type="submit"
              className="btn primary sm"
              disabled={saving || !knownLocationName.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Save location
            </button>
          </div>
        </form>
      )}

      {!loading && !suggestion && !lockedLocation && !isOrganizer && (
        <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
          No location has been chosen yet.
        </p>
      )}

      {!loading && !suggestion && !lockedLocation && isOrganizer && (
        <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
          No centered suggestion yet. You can still save a known location now.
        </p>
      )}

      {(suggestion || lockedLocation) && (
        <>
          <div className="location-options">
            {lockedLocation && (
              <div className="location-card chosen">
                <div className="between flex-col items-start sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <span className="badge sage">Chosen spot</span>
                    <h4 className="location-name">
                      {lockedLocation.lockedLocationName}
                    </h4>
                    {lockedCoordinates && (
                      <p className="muted text-sm">{lockedCoordinates}</p>
                    )}
                  </div>
                  {lockedMapHref && (
                    <a
                      href={lockedMapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn ghost sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View map
                    </a>
                  )}
                </div>
              </div>
            )}

            {suggestion && (
              <div className="location-card suggested">
                <div className="between flex-col items-start sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <span className="badge">Suggested / centered</span>
                    <h4 className="location-name">{suggestionName}</h4>
                    {suggestionCoordinates && (
                      <p className="muted text-sm">{suggestionCoordinates}</p>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${suggestion.centerLat},${suggestion.centerLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn ghost sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View map
                  </a>
                  {isOrganizer && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={handleUseSuggestion}
                      disabled={saving}
                    >
                      Use suggestion
                    </button>
                  )}
                </div>

                <p className="muted mt-4 text-sm">
                  avg {formatDriveTime(averageDrive)} drive for{" "}
                  {suggestion.households.length} household
                  {suggestion.households.length === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>

          {sortedHouseholds.length > 0 && (
            <div>
              <div className="between mb-3">
                <div>
                  <p className="label mb-0">Household drive times</p>
                  <p className="muted text-sm">Farthest household first.</p>
                </div>
                <span className="badge muted">
                  {Math.round(farthestDistance)} mi farthest
                </span>
              </div>

              <div className="location-drive-list">
                {sortedHouseholds.map((household) => (
                  <div
                    className="location-drive-row"
                    key={household.householdId}
                  >
                    <span className="avatar">
                      {householdInitials(household.primaryContactName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {household.primaryContactName}
                      </p>
                      <p className="muted text-xs">
                        {formatDriveTime(household.estimatedDriveHours)}{" "}
                        estimated drive
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm">
                      <span className="muted inline-flex items-center gap-1">
                        <Navigation className="h-3.5 w-3.5" />
                        {Math.round(household.distanceMiles)} mi
                      </span>
                      <span className="muted inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDriveTime(household.estimatedDriveHours)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
