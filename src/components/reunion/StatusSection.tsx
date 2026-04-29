"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Lock,
  CheckCircle2,
  Circle,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { lockDate, finalizeReunion } from "@/lib/actions/finalize";
import { expectArray, expectArrayField, expectRecord } from "@/lib/response";
import type { DateOption } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatusSectionProps {
  reunionId: string;
  currentStatus: string;
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

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  if (startMonth !== endMonth) return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  if (startDay !== endDay) return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  return `${startMonth} ${startDay}, ${year}`;
}

// Step state types
type StepState = "done" | "active" | "pending";

interface StepProps {
  state: StepState;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  body?: React.ReactNode;
}

function StepRow({ state, title, subtitle, action, body }: StepProps) {
  const isDone = state === "done";
  const isActive = state === "active";

  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border overflow-hidden mb-4", {
        "border-[var(--border)] bg-[var(--bg)]": !isActive,
        "border-[var(--primary)] bg-[var(--bg)]": isActive,
      })}
      style={
        isActive
          ? { boxShadow: "0 0 0 3px oklch(0.55 0.13 40 / 0.10)" }
          : undefined
      }
    >
      {/* Step header */}
      <div className="flex items-center gap-4 px-6 py-5">
        {/* Step icon */}
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            background: isDone
              ? "var(--sage)"
              : isActive
                ? "var(--primary)"
                : "var(--muted)",
            color: isDone || isActive ? "white" : "var(--ink-soft)",
          }}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isActive ? (
            <Circle className="h-4 w-4 fill-white" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </span>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-[1.05rem] leading-tight"
            style={{ color: isDone ? "var(--ink-soft)" : "var(--ink)" }}
          >
            {title}
          </h3>
          <small className="mt-0.5 block text-sm" style={{ color: "var(--ink-soft)" }}>
            {subtitle}
          </small>
        </div>

        {/* Optional action button (edit / preview) */}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Expanded body for active step */}
      {isActive && body && (
        <div
          className="px-6 pb-6 pt-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {body}
        </div>
      )}
    </div>
  );
}

export function StatusSection({ reunionId, currentStatus }: StatusSectionProps) {
  const router = useRouter();
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateOptionId, setSelectedDateOptionId] = useState<string>("");
  const [manualLocationName, setManualLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (currentStatus === "planning") {
        const res = await fetch(`/api/reunions/${reunionId}/dates`);
        if (res.ok) {
          const json = expectArray<DateOption>(
            await res.json(),
            "reunion date options"
          );
          setDateOptions(json);
          if (json.length > 0) setSelectedDateOptionId(json[0].id);
        }
      } else if (currentStatus === "date_locked") {
        const res = await fetch(`/api/reunions/${reunionId}/location`);
        if (res.ok) {
          const json = expectRecord(
            await res.json(),
            "reunion location summary"
          );
          const households = expectArrayField<LocationData["households"][number]>(
            json,
            "households",
            "reunion location summary"
          );
          const centerLat =
            typeof json.centerLat === "number" ? json.centerLat : null;
          const centerLng =
            typeof json.centerLng === "number" ? json.centerLng : null;

          const lockedLocationName =
            typeof json.lockedLocationName === "string"
              ? json.lockedLocationName
              : null;
          setLocationData({
            centerLat,
            centerLng,
            centerName:
              typeof json.centerName === "string" ? json.centerName : null,
            lockedLocationName,
            lockedLocationLat:
              typeof json.lockedLocationLat === "number"
                ? json.lockedLocationLat
                : null,
            lockedLocationLng:
              typeof json.lockedLocationLng === "number"
                ? json.lockedLocationLng
                : null,
            households,
          });
          setManualLocationName(lockedLocationName ?? "");
        }
      }
    } catch (error) {
      console.error("Failed to fetch status data:", error);
    } finally {
      setLoading(false);
    }
  }, [reunionId, currentStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLockDate() {
    if (!selectedDateOptionId) return;
    try {
      setSubmitting(true);
      await lockDate(reunionId, selectedDateOptionId);
      toast.success("Date locked successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to lock date");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function finalizeWithLocation(
    locationName: string,
    locationLat: number | null,
    locationLng: number | null
  ) {
    const normalizedLocationName = locationName.trim();
    if (!normalizedLocationName) {
      toast.error("Enter a location first");
      return;
    }

    try {
      setSubmitting(true);
      await finalizeReunion(
        reunionId,
        normalizedLocationName,
        locationLat,
        locationLng
      );
      toast.success("Reunion finalized!");
      router.refresh();
    } catch (error) {
      toast.error("Failed to finalize reunion");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinalizeSavedLocation() {
    if (!locationData?.lockedLocationName) return;
    await finalizeWithLocation(
      locationData.lockedLocationName,
      locationData.lockedLocationLat,
      locationData.lockedLocationLng
    );
  }

  async function handleFinalizeSuggestedLocation() {
    if (
      !locationData ||
      locationData.centerLat === null ||
      locationData.centerLng === null
    ) {
      return;
    }
    await finalizeWithLocation(
      locationData.centerName ??
        `${locationData.centerLat.toFixed(4)}, ${locationData.centerLng.toFixed(4)}`,
      locationData.centerLat,
      locationData.centerLng
    );
  }

  async function handleFinalizeManualLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await finalizeWithLocation(manualLocationName, null, null);
  }

  // Derive step states
  const isFinalized = currentStatus === "finalized";
  const isDateLocked = currentStatus === "date_locked" || isFinalized;
  const isCancelled = currentStatus === "cancelled";

  if (isCancelled) {
    return (
      <StepRow
        state="pending"
        title="Reunion Cancelled"
        subtitle="This reunion has been cancelled."
        action={<Lock className="h-5 w-5 text-destructive" />}
      />
    );
  }

  // Step 1: Date locked
  const step1State: StepState = isDateLocked ? "done" : "active";
  // Step 2: Location / finalized
  const step2State: StepState = isFinalized
    ? "done"
    : isDateLocked
      ? "active"
      : "pending";
  // Step 3: Plan published (mirrors finalized)
  const step3State: StepState = isFinalized ? "done" : "pending";

  // Body for the "lock date" active step
  const lockDateBody = loading ? (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ink-soft)" }} />
    </div>
  ) : dateOptions.length === 0 ? (
    <p className="text-sm" style={{ color: "var(--ink-soft)", paddingTop: "0.25rem" }}>
      Add date options first before locking a date.
    </p>
  ) : (
    <div className="space-y-4">
      <div className="space-y-2">
        {dateOptions.map((opt) => (
          <label
            key={opt.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-3 transition-colors",
              selectedDateOptionId === opt.id
                ? "border-[var(--primary)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] hover:border-[var(--primary)]"
            )}
          >
            <input
              type="radio"
              name="date-option"
              value={opt.id}
              checked={selectedDateOptionId === opt.id}
              onChange={() => setSelectedDateOptionId(opt.id)}
              className="accent-primary"
            />
            <div>
              <p className="text-sm font-medium">
                {formatDateRange(opt.startDate, opt.endDate)}
              </p>
              {opt.description && (
                <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                  {opt.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
      <button
        className="btn sm"
        onClick={handleLockDate}
        disabled={submitting || !selectedDateOptionId}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        Lock Date
      </button>
    </div>
  );

  // Body for the "finalize reunion" active step
  const hasSavedLocation = Boolean(locationData?.lockedLocationName);
  const hasSuggestedLocation =
    locationData?.centerLat !== null &&
    locationData?.centerLat !== undefined &&
    locationData?.centerLng !== null &&
    locationData?.centerLng !== undefined;
  const suggestedLocationName =
    hasSuggestedLocation && locationData
      ? locationData.centerName ??
        `${locationData.centerLat!.toFixed(4)}, ${locationData.centerLng!.toFixed(4)}`
      : null;

  const finalizeBody = loading ? (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ink-soft)" }} />
    </div>
  ) : (
    <div className="space-y-4">
      {hasSavedLocation && locationData && (
        <div
          className="rounded-[var(--radius-md)] p-4"
          style={{ background: "var(--sage-soft)" }}
        >
          <p className="mb-1 text-sm font-medium">Saved location</p>
          <p className="text-lg font-semibold">
            {locationData.lockedLocationName}
          </p>
          <button
            className="btn sm mt-3"
            onClick={handleFinalizeSavedLocation}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Finalize with saved location
          </button>
        </div>
      )}

      <form className="space-y-3" onSubmit={handleFinalizeManualLocation}>
        <div>
          <label className="label" htmlFor="finalize-known-location">
            Known location
          </label>
          <input
            id="finalize-known-location"
            className="input"
            value={manualLocationName}
            onChange={(event) => setManualLocationName(event.target.value)}
            placeholder="Lake Anna State Park - Pavilion B"
            maxLength={240}
          />
        </div>
        <button
          type="submit"
          className="btn ghost sm"
          disabled={submitting || !manualLocationName.trim()}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          Finalize with known location
        </button>
      </form>

      {hasSuggestedLocation && suggestedLocationName && (
        <div
          className="rounded-[var(--radius-md)] p-4"
          style={{ background: "var(--muted)" }}
        >
          <p className="mb-1 text-sm font-medium">Suggested location</p>
          <p className="text-lg font-semibold">{suggestedLocationName}</p>
          <button
            className="btn ghost sm mt-3"
            onClick={handleFinalizeSuggestedLocation}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Use suggestion
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Step 1 - Lock a date */}
      <StepRow
        state={step1State}
        title="Lock a Date"
        subtitle={
          isDateLocked
            ? "Date confirmed for the reunion"
            : "Choose a date to lock in for the reunion"
        }
        action={
          step1State === "done" ? (
            <span className="btn ghost sm">
              <Calendar className="h-4 w-4" />
              Edit
            </span>
          ) : undefined
        }
        body={step1State === "active" ? lockDateBody : undefined}
      />

      {/* Step 2 - Finalize location */}
      <StepRow
        state={step2State}
        title={isFinalized ? "Location Finalized" : "Finalize Reunion"}
        subtitle={
          isFinalized
            ? "Location confirmed and plan sent to everyone"
            : isDateLocked
              ? "Confirm the location and send the final plan"
              : "Complete date selection first"
        }
        action={
          step2State === "done" ? (
            <span className="btn ghost sm">
              <MapPin className="h-4 w-4" />
              Edit
            </span>
          ) : undefined
        }
        body={step2State === "active" ? finalizeBody : undefined}
      />

      {/* Step 3 - Plan published */}
      <StepRow
        state={step3State}
        title="Plan Published"
        subtitle={
          isFinalized
            ? "The final plan has been shared with all households"
            : "Locks date + location, emails everyone the details"
        }
        action={
          isFinalized ? (
            <Link href={`/reunion/${reunionId}/plan`} className="btn ghost sm">
              <ExternalLink className="h-4 w-4" />
              View Plan
            </Link>
          ) : (
            <span className="btn ghost sm" style={{ opacity: 0.5, cursor: "default" }}>
              Preview
            </span>
          )
        }
      />
    </div>
  );
}
