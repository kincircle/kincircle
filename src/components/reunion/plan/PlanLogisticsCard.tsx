import { Calendar, MapPin, Navigation } from "lucide-react";
import { haversineDistance, estimateDriveTime } from "@/lib/location";
import type { Reunion, Household } from "@/types";

interface PlanLogisticsCardProps {
  reunion: Reunion;
  dateLabel: string | null;
  viewerHousehold: Household | null;
}

function formatDriveTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function PlanLogisticsCard({
  reunion,
  dateLabel,
  viewerHousehold,
}: PlanLogisticsCardProps) {
  const locationName = reunion.lockedLocationName;
  const lat = reunion.lockedLocationLat;
  const lng = reunion.lockedLocationLng;

  const directionsHref =
    lat !== null && lng !== null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : locationName
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`
      : null;

  // Compute driving distance/time from viewer household to reunion location
  let driveDisplay: { value: string; sub: string } | null = null;
  if (
    viewerHousehold?.lat !== null &&
    viewerHousehold?.lat !== undefined &&
    viewerHousehold?.lng !== null &&
    viewerHousehold?.lng !== undefined &&
    lat !== null &&
    lat !== undefined &&
    lng !== null &&
    lng !== undefined
  ) {
    const distanceMiles = haversineDistance(
      viewerHousehold.lat,
      viewerHousehold.lng,
      lat,
      lng
    );
    const driveHours = estimateDriveTime(distanceMiles);
    const cityState = [viewerHousehold.city, viewerHousehold.state]
      .filter(Boolean)
      .join(", ");
    driveDisplay = {
      value: `About ${formatDriveTime(driveHours)}`,
      sub: cityState
        ? `${cityState} to ${locationName ?? "the venue"}`
        : `Approx. ${Math.round(distanceMiles)} miles`,
    };
  }

  return (
    <div className="kc-plan-card">
      <div className="kc-plan-details">
        {/* When */}
        <div className="kc-plan-detail-row">
          <div className="kc-plan-detail-icon">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="kc-plan-detail-label">When</p>
            <p className="kc-plan-detail-value">
              {dateLabel ?? "Date not locked"}
            </p>
            <p className="kc-plan-detail-sub">
              Check the updates below for arrival time details
            </p>
          </div>
        </div>

        {/* Where */}
        <div className="kc-plan-detail-row">
          <div className="kc-plan-detail-icon">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="kc-plan-detail-label">Where</p>
            <p className="kc-plan-detail-value">
              {locationName ?? "Location not set"}
            </p>
            <p className="kc-plan-detail-sub">
              {locationName
                ? "Open directions when you're ready to head out"
                : "The organizer is choosing the final spot"}
            </p>
          </div>
        </div>

        {/* Driving from your place */}
        <div className="kc-plan-detail-row">
          <div className="kc-plan-detail-icon">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <p className="kc-plan-detail-label">Driving from your place</p>
            {driveDisplay ? (
              <>
                <p className="kc-plan-detail-value">{driveDisplay.value}</p>
                <p className="kc-plan-detail-sub">{driveDisplay.sub}</p>
              </>
            ) : (
              <p className="kc-plan-detail-value" style={{ fontSize: "0.95rem", color: "var(--ink-soft)" }}>
                Add your address on your household profile to see driving time
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map side */}
      <div className="kc-map-side">
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Decorative terrain blob */}
          <path
            d="M 50 80 Q 100 60 160 80 L 220 70 Q 280 75 340 90 L 360 130 Q 350 170 330 200 L 280 220 Q 220 230 160 215 L 100 200 Q 60 170 50 130 Z"
            fill="oklch(0.78 0.05 70 / 0.4)"
            stroke="oklch(0.55 0.08 50)"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />
          {/* Wavy road path */}
          <path
            d="M 60 200 L 180 165 L 220 145"
            stroke="oklch(0.55 0.13 40 / 0.5)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
          />
          {/* Second path for extra detail */}
          <path
            d="M 280 80 Q 310 100 300 140 L 290 180"
            stroke="oklch(0.6 0.08 65 / 0.35)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="3 5"
          />
          {/* Small terrain dots */}
          <circle cx="120" cy="110" r="4" fill="oklch(0.65 0.08 60 / 0.5)" />
          <circle cx="135" cy="118" r="3" fill="oklch(0.65 0.08 60 / 0.4)" />
          <circle cx="110" cy="122" r="3.5" fill="oklch(0.65 0.08 60 / 0.45)" />
        </svg>
        <div className="kc-map-pin" />
        {directionsHref ? (
          <a
            href={directionsHref}
            className="btn secondary kc-directions"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="h-3.5 w-3.5" />
            Get directions
          </a>
        ) : (
          <span className="badge muted kc-directions">Directions pending</span>
        )}
      </div>
    </div>
  );
}
