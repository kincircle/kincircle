import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { InviteSection } from "@/components/reunion/InviteSection";
import { HouseholdList } from "@/components/reunion/HouseholdList";
import { DateOptionsSection } from "@/components/reunion/DateOptionsSection";
import { VotingSection } from "@/components/reunion/VotingSection";
import { LocationSection } from "@/components/reunion/LocationSection";
import { StatusSection } from "@/components/reunion/StatusSection";
import { UpdatesSection } from "@/components/reunion/UpdatesSection";
import { HeroPhotoUploader } from "@/components/reunion/HeroPhotoUploader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCloudinaryApiKey, getCloudinaryCloudName } from "@/lib/env";

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

function formatLockedDateShort(dateStr: string | null): string {
  if (!dateStr) {
    return "date TBD";
  }

  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateStr}T00:00:00`);
  return Math.max(
    0,
    Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function getNextUpNudge(
  status: string,
  householdCount: number,
  isOrganizer: boolean
) {
  if (!isOrganizer) {
    return {
      text: "Review the latest details and updates from the organizer.",
      href: "#reunion-updates",
      cta: "Read updates",
    };
  }

  if (status === "date_locked") {
    return {
      text: "Choose a location so the final plan can go out to everyone.",
      href: "#reunion-location",
      cta: "Choose location",
    };
  }

  if (status === "finalized") {
    return {
      text: "The final plan is ready for the family.",
      href: "#reunion-updates",
      cta: "Post update",
    };
  }

  if (householdCount === 0) {
    return {
      text: "Add households so your family can start voting on dates.",
      href: "#reunion-invite",
      cta: "Add households",
    };
  }

  return {
    text: "Add date options and invite households to vote.",
    href: "#reunion-dates",
    cta: "Pick dates",
  };
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
  const countdownDays = daysUntil(found.lockedDate);
  const nextUp = getNextUpNudge(found.status, householdCount, isOrganizer);
  const cloudinaryUploadConfig = isOrganizer
    ? {
        cloudName: getCloudinaryCloudName(),
        apiKey: getCloudinaryApiKey(),
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[1180px] px-6 py-6 sm:py-8">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="btn ghost sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>

          <section className="relative h-[220px] overflow-hidden rounded-[var(--radius-xl)] bg-muted shadow-[var(--shadow-md)] sm:h-[240px]">
            <Image
              src={heroImageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 1200px, calc(100vw - 2rem)"
              unoptimized={heroImageUrl.startsWith("http")}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/65" />
            {cloudinaryUploadConfig && (
              <div className="absolute right-4 top-4 z-10">
                <HeroPhotoUploader
                  reunionId={id}
                  cloudName={cloudinaryUploadConfig.cloudName}
                  apiKey={cloudinaryUploadConfig.apiKey}
                />
              </div>
            )}
            <div className="relative flex h-full flex-col justify-end gap-2 p-6 text-white sm:px-8">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="badge on-photo">
                  {statusLabels[found.status]}
                </span>
                <span className="badge on-photo">
                  {formatLockedDate(found.lockedDate)}
                </span>
                <span className="badge on-photo">
                  {pluralize(householdCount, "household")}
                </span>
                <span className="badge on-photo">
                  {pluralize(totalPartySize, "person", "people")}
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-tight text-white">
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

          <div className="my-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              {isOrganizer ? (
                <>
                  <section id="reunion-status">
                    <StatusSection reunionId={id} currentStatus={found.status} />
                  </section>
                  <section id="reunion-invite">
                    <InviteSection reunionId={id} />
                  </section>
                  <section id="reunion-dates">
                    <DateOptionsSection reunionId={id} />
                  </section>
                  <section id="reunion-location">
                    <LocationSection reunionId={id} isOrganizer={isOrganizer} />
                  </section>
                </>
              ) : (
                <>
                  <section id="reunion-dates">
                    <VotingSection reunionId={id} />
                  </section>
                  <section id="reunion-location">
                    <LocationSection reunionId={id} isOrganizer={isOrganizer} />
                  </section>
                </>
              )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {/* Countdown card */}
              <div className="card raised">
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div className="font-serif leading-none" style={{ fontSize: "3rem", color: "var(--primary)" }}>
                    {countdownDays ?? "--"}
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
                    {countdownDays === null
                      ? "days to go"
                      : `days until ${formatLockedDateShort(found.lockedDate)}`}
                  </div>
                </div>
              </div>

              {/* Stats card */}
              <div className="card raised">
                <h4 className="mb-4 text-base">By the numbers</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-3xl leading-none" style={{ color: "var(--primary)" }}>
                      {householdCount}
                    </span>
                    <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
                      households
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-3xl leading-none" style={{ color: "var(--primary)" }}>
                      {respondedCount}
                    </span>
                    <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
                      RSVPed
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-serif text-3xl leading-none" style={{ color: "var(--primary)" }}>
                      {totalPartySize}
                    </span>
                    <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
                      people
                    </span>
                  </div>
                </div>
              </div>

              {/* Next up CTA card */}
              <div className="card raised border-transparent" style={{ background: "var(--accent-soft)" }}>
                <h4 className="text-base" style={{ color: "var(--accent-foreground)" }}>
                  Next up
                </h4>
                <p className="mt-2 text-sm" style={{ color: "var(--accent-foreground)" }}>
                  {nextUp.text}
                </p>
                <a href={nextUp.href} className="btn sm" style={{ marginTop: "0.75rem" }}>
                  {nextUp.cta}
                </a>
              </div>

              <p className="px-1 text-sm text-muted-foreground">
                {isOrganizer
                  ? "You are the organizer of this reunion."
                  : responseSummary}
              </p>
            </aside>
          </div>

          <div className="space-y-6">
            {isOrganizer && <HouseholdList reunionId={id} organizerId={found.organizerId} />}
            <section id="reunion-updates">
              <UpdatesSection reunionId={id} isOrganizer={isOrganizer} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
