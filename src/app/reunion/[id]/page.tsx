import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteSection } from "@/components/reunion/InviteSection";
import { HouseholdList } from "@/components/reunion/HouseholdList";
import { DateOptionsSection } from "@/components/reunion/DateOptionsSection";
import { VotingSection } from "@/components/reunion/VotingSection";
import { LocationSection } from "@/components/reunion/LocationSection";
import { StatusSection } from "@/components/reunion/StatusSection";
import { UpdatesSection } from "@/components/reunion/UpdatesSection";
import { ArrowLeft, CalendarDays, Home, Users } from "lucide-react";
import Link from "next/link";

const FALLBACK_HERO_IMAGE_URL =
  "/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_8fd89a70be.jpeg";

const statusLabels: Record<string, string> = {
  planning: "Planning",
  date_locked: "Date Locked",
  finalized: "Finalized",
  cancelled: "Cancelled",
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatLockedDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Date not locked";
  }

  const date = new Date(`${dateStr}T00:00:00`);
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} locked`;
}

export default async function ReunionDetailPage({
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

  // Authorization: must be organizer or have a claimed household
  const isOrganizer = found.organizerId === session.user.id;
  if (!isOrganizer) {
    const [hh] = await db
      .select()
      .from(household)
      .where(
        and(eq(household.reunionId, id), eq(household.claimedByUserId, session.user.id))
      );
    if (!hh) notFound(); // 404 rather than 403 to avoid leaking existence
  }

  // Fetch household count for summary
  const households = await db
    .select()
    .from(household)
    .where(eq(household.reunionId, id));
  const householdCount = households.length;
  const respondedCount = households.filter(
    (h) => h.rsvpStatus !== "pending"
  ).length;
  const totalPartySize = households.reduce(
    (sum, h) => sum + (h.partySize ?? 1),
    0
  );
  const heroImageUrl = found.heroImageUrl || FALLBACK_HERO_IMAGE_URL;
  const responseSummary =
    householdCount > 0
      ? `${respondedCount} of ${householdCount} household${
          householdCount === 1 ? "" : "s"
        } have responded`
      : "No households yet";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>

          <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-muted shadow-md">
            <Image
              src={heroImageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 1200px, calc(100vw - 2rem)"
              unoptimized={heroImageUrl.startsWith("http")}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
            <div className="relative flex min-h-[14rem] flex-col justify-end gap-4 p-5 text-white sm:min-h-[17rem] sm:p-8">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
                  {statusLabels[found.status]}
                </Badge>
                <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
                  {formatLockedDate(found.lockedDate)}
                </Badge>
                <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
                  {pluralize(householdCount, "household")}
                </Badge>
                <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
                  {pluralize(totalPartySize, "person", "people")}
                </Badge>
              </div>

              <div className="max-w-3xl">
                <h1 className="text-3xl font-medium text-white sm:text-4xl lg:text-5xl">
                  {found.name}
                </h1>
                {found.description && (
                  <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
                    {found.description}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              {isOrganizer ? (
                <>
                  <StatusSection reunionId={id} currentStatus={found.status} />
                  <InviteSection reunionId={id} />
                  <DateOptionsSection reunionId={id} />
                  <LocationSection reunionId={id} />
                </>
              ) : (
                <>
                  <VotingSection reunionId={id} />
                  <LocationSection reunionId={id} />
                </>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
              <Card>
                <CardHeader>
                  <CardTitle>Reunion Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {formatLockedDate(found.lockedDate)}
                      </p>
                      <p className="text-muted-foreground">
                        {statusLabels[found.status]} status
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{responseSummary}</p>
                      <p className="text-muted-foreground">
                        {pluralize(totalPartySize, "person", "people")} across{" "}
                        {pluralize(householdCount, "household")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Home className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {isOrganizer ? "Organizer view" : "Household view"}
                      </p>
                      <p className="text-muted-foreground">
                        {isOrganizer
                          ? "You are the organizer of this reunion."
                          : "Vote on dates, review location details, and read updates."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>

          <div className="mt-8 space-y-6">
            {isOrganizer && <HouseholdList reunionId={id} />}
            <UpdatesSection reunionId={id} isOrganizer={isOrganizer} />
          </div>
        </div>
      </main>
    </div>
  );
}
