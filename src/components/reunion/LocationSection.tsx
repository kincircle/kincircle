"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, MapPin, Navigation, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { expectArrayField, expectRecord } from "@/lib/response";

interface LocationSectionProps {
  reunionId: string;
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

export function LocationSection({ reunionId }: LocationSectionProps) {
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reunions/${reunionId}/location`);
      if (!res.ok) {
        throw new Error("Failed to fetch location");
      }
      const json = expectRecord(
        await res.json(),
        "reunion location summary"
      );
      const households = expectArrayField<LocationData["households"][number]>(
        json,
        "households",
        "reunion location summary"
      );
      setData({
        centerLat: typeof json.centerLat === "number" ? json.centerLat : null,
        centerLng: typeof json.centerLng === "number" ? json.centerLng : null,
        centerName: typeof json.centerName === "string" ? json.centerName : null,
        households,
      });
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Location Summary</CardTitle>
        </div>
        <CardDescription>
          Suggested reunion location based on household addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && (!data || data.households.length === 0) && (
          <p className="text-sm text-muted-foreground py-4">
            No household locations available yet. Locations will appear as
            guests RSVP with their city.
          </p>
        )}

        {!loading &&
          data &&
          data.centerLat !== null &&
          data.centerLng !== null &&
          data.households.length > 0 && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">
                    Suggested Location
                  </p>
                  <p className="text-lg font-semibold">
                    {data.centerName ||
                      `${data.centerLat.toFixed(4)}, ${data.centerLng.toFixed(4)}`}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${data.centerLat},${data.centerLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline whitespace-nowrap"
                >
                  View on map
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">
                Household Distances (farthest first)
              </p>
              <div className="space-y-2">
                {[...data.households]
                  .sort((a, b) => b.distanceMiles - a.distanceMiles)
                  .map((hh) => (
                    <div
                      key={hh.householdId}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                    >
                      <span className="text-sm font-medium">
                        {hh.primaryContactName}
                      </span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          <span>{Math.round(hh.distanceMiles)} mi</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{hh.estimatedDriveHours.toFixed(1)} hrs</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
