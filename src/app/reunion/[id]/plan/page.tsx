import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  planning: "Planning",
  date_locked: "Date Locked",
  finalized: "Finalized",
  cancelled: "Cancelled",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  planning: "secondary",
  date_locked: "default",
  finalized: "outline",
  cancelled: "destructive",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  if (startMonth !== endMonth)
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  if (startDay !== endDay)
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  return `${startMonth} ${startDay}, ${year}`;
}

export default async function FinalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // Fetch the reunion
  const [found] = await db.select().from(reunion).where(eq(reunion.id, id));
  if (!found) notFound();

  // Only accessible when date_locked or finalized
  if (found.status === "planning" || found.status === "cancelled") {
    redirect(`/reunion/${id}`);
  }

  // Authorization: must be organizer or have a claimed household
  const isOrganizer = found.organizerId === session.user.id;
  if (!isOrganizer) {
    const [hh] = await db
      .select()
      .from(household)
      .where(
        and(eq(household.reunionId, id), eq(household.claimedByUserId, session.user.id))
      );
    if (!hh) notFound();
  }

  // Fetch attending households (yes or maybe)
  const attendingHouseholds = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, id),
        inArray(household.rsvpStatus, ["yes", "maybe"])
      )
    );

  // Prefer the explicit locked option; fall back to legacy lockedDate records.
  let dateRange: string | null = null;
  if (found.lockedDateOptionId) {
    const [lockedDateOption] = await db
      .select()
      .from(dateOption)
      .where(
        and(
          eq(dateOption.id, found.lockedDateOptionId),
          eq(dateOption.reunionId, id)
        )
      );
    if (lockedDateOption) {
      dateRange = formatDateRange(
        lockedDateOption.startDate,
        lockedDateOption.endDate
      );
    }
  }

  if (!dateRange && found.lockedDate) {
    const [matchingDate] = await db
      .select()
      .from(dateOption)
      .where(
        and(
          eq(dateOption.reunionId, id),
          eq(dateOption.startDate, found.lockedDate)
        )
      );
    if (matchingDate) {
      dateRange = formatDateRange(matchingDate.startDate, matchingDate.endDate);
    } else {
      dateRange = formatDate(found.lockedDate);
    }
  }

  const totalPartySize = attendingHouseholds.reduce(
    (sum, hh) => sum + (hh.partySize ?? 1),
    0
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/reunion/${id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to Reunion
          </Link>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{found.name} &mdash; Plan</h1>
            {found.description && (
              <p className="text-muted-foreground mt-2">{found.description}</p>
            )}
          </div>
          <Badge variant={statusVariants[found.status]}>
            {statusLabels[found.status]}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Date Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Date</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {dateRange ? (
                <p className="text-lg font-semibold">{dateRange}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Date not yet locked
                </p>
              )}
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Location</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {found.lockedLocationName ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    {found.lockedLocationName}
                  </p>
                  {found.lockedLocationLat && found.lockedLocationLng && (
                    <a
                      href={`https://www.google.com/maps?q=${found.lockedLocationLat},${found.lockedLocationLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View on Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Location not yet set
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attending Households Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>
                Who&apos;s Coming ({totalPartySize} guest
                {totalPartySize !== 1 ? "s" : ""})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {attendingHouseholds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No confirmed attendees yet.
              </p>
            ) : (
              <div className="space-y-2">
                {attendingHouseholds.map((hh) => (
                  <div
                    key={hh.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {hh.primaryContactName}
                      </p>
                      {(hh.city || hh.state) && (
                        <p className="text-xs text-muted-foreground">
                          {[hh.city, hh.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          hh.rsvpStatus === "yes" ? "default" : "secondary"
                        }
                      >
                        {hh.rsvpStatus === "yes" ? "Attending" : "Maybe"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {hh.partySize ?? 1} guest
                        {(hh.partySize ?? 1) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
