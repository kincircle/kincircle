"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle, Calendar, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { lockDate, finalizeReunion } from "@/lib/actions/finalize";
import { expectArray, expectArrayField, expectRecord } from "@/lib/response";
import type { DateOption } from "@/types";
import Link from "next/link";

interface StatusSectionProps {
  reunionId: string;
  currentStatus: string;
}

interface LocationData {
  centerLat: number | null;
  centerLng: number | null;
  centerName: string | null;
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

export function StatusSection({ reunionId, currentStatus }: StatusSectionProps) {
  const router = useRouter();
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateOptionId, setSelectedDateOptionId] = useState<string>("");
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

          if (centerLat === null || centerLng === null) {
            setLocationData(null);
          } else {
            setLocationData({
              centerLat,
              centerLng,
              centerName:
                typeof json.centerName === "string" ? json.centerName : null,
              households,
            });
          }
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

  async function handleFinalize() {
    if (
      !locationData ||
      locationData.centerLat === null ||
      locationData.centerLng === null
    ) {
      return;
    }
    try {
      setSubmitting(true);
      await finalizeReunion(
        reunionId,
        locationData.centerName ?? `${locationData.centerLat.toFixed(4)}, ${locationData.centerLng.toFixed(4)}`,
        locationData.centerLat,
        locationData.centerLng
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

  if (currentStatus === "finalized") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle>Reunion Finalized</CardTitle>
          </div>
          <CardDescription>
            This reunion has been finalized. The plan has been shared with all households.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/reunion/${reunionId}/plan`}>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Final Plan
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (currentStatus === "cancelled") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            <CardTitle>Reunion Cancelled</CardTitle>
          </div>
          <CardDescription>
            This reunion has been cancelled.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {currentStatus === "planning" ? (
            <Calendar className="h-5 w-5 text-muted-foreground" />
          ) : (
            <MapPin className="h-5 w-5 text-muted-foreground" />
          )}
          <CardTitle>
            {currentStatus === "planning" ? "Lock a Date" : "Finalize Reunion"}
          </CardTitle>
        </div>
        <CardDescription>
          {currentStatus === "planning"
            ? "Choose a date to lock in for the reunion. This will notify all households."
            : "Confirm the location and finalize the reunion plan."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && currentStatus === "planning" && (
          <>
            {dateOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Add date options first before locking a date.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {dateOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-colors ${
                        selectedDateOptionId === opt.id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
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
                          <p className="text-xs text-muted-foreground">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={handleLockDate}
                  disabled={submitting || !selectedDateOptionId}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Lock Date
                </Button>
              </div>
            )}
          </>
        )}

        {!loading && currentStatus === "date_locked" && (
          <>
            {!locationData ||
            locationData.centerLat === null ||
            locationData.centerLng === null ? (
              <p className="text-sm text-muted-foreground py-4">
                No location data available yet. Locations will appear as guests
                RSVP with their city.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Suggested Location</p>
                  <p className="text-lg font-semibold">
                    {locationData.centerName ??
                      `${locationData.centerLat.toFixed(4)}, ${locationData.centerLng.toFixed(4)}`}
                  </p>
                </div>
                <Button onClick={handleFinalize} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Finalize Reunion
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
