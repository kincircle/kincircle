import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dateOption,
  household,
  householdMember,
  potluckItem,
  reunion,
  reunionUpdate,
  user,
} from "@/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { HeroCountdown } from "@/components/reunion/plan/HeroCountdown";
import { PlanLogisticsCard } from "@/components/reunion/plan/PlanLogisticsCard";
import { HouseholdsGrid } from "@/components/reunion/plan/HouseholdsGrid";
import {
  PotluckSection,
  type PotluckListItem,
} from "@/components/reunion/plan/PotluckSection";
import { UpdatesStack } from "@/components/reunion/plan/UpdatesStack";
import { CloserQuote } from "@/components/reunion/plan/CloserQuote";
import { PlanFooter } from "@/components/reunion/plan/PlanFooter";

function formatDateLong(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startMonth = start.toLocaleDateString("en-US", { month: "long" });
  const endMonth = end.toLocaleDateString("en-US", { month: "long" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (startDate === endDate) return formatDateLong(startDate);
  if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endDay}, ${year}`;
}

function compactCalendarDate(dateStr: string, addDays = 0): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + addDays);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function googleCalendarHref({
  title,
  startDate,
  endDate,
  location,
}: {
  title: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
}): string | null {
  if (!startDate) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${compactCalendarDate(startDate)}/${compactCalendarDate(
      endDate ?? startDate,
      1
    )}`,
  });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default async function FinalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const [found] = await db.select().from(reunion).where(eq(reunion.id, id));
  if (!found) notFound();

  if (found.status === "planning" || found.status === "cancelled") {
    redirect(`/reunion/${id}`);
  }

  const isOrganizer = found.organizerId === session.user.id;
  const [currentHousehold] = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, id),
        eq(household.claimedByUserId, session.user.id)
      )
    );
  if (!isOrganizer && !currentHousehold) notFound();

  let dateLabel: string | null = null;
  let calendarStartDate = found.lockedDate;
  let calendarEndDate = found.lockedDate;

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
      dateLabel = formatDateRange(
        lockedDateOption.startDate,
        lockedDateOption.endDate
      );
      calendarStartDate = lockedDateOption.startDate;
      calendarEndDate = lockedDateOption.endDate;
    }
  }
  if (!dateLabel && found.lockedDate) {
    dateLabel = formatDateLong(found.lockedDate);
  }

  const attendingHouseholds = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, id),
        inArray(household.rsvpStatus, ["yes", "maybe"])
      )
    );

  const householdIds = attendingHouseholds.map((h) => h.id);
  const members =
    householdIds.length > 0
      ? await db
          .select()
          .from(householdMember)
          .where(inArray(householdMember.householdId, householdIds))
      : [];

  const [organizer] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, found.organizerId));

  const updateRows = await db
    .select({
      id: reunionUpdate.id,
      title: reunionUpdate.title,
      message: reunionUpdate.message,
      createdAt: reunionUpdate.createdAt,
      authorName: user.name,
    })
    .from(reunionUpdate)
    .leftJoin(user, eq(reunionUpdate.createdBy, user.id))
    .where(eq(reunionUpdate.reunionId, id))
    .orderBy(desc(reunionUpdate.createdAt))
    .limit(3);

  const potluckRows: PotluckListItem[] = await db
    .select({
      id: potluckItem.id,
      name: potluckItem.name,
      notes: potluckItem.notes,
      claimedByHouseholdId: potluckItem.claimedByHouseholdId,
      claimedByHouseholdName: household.primaryContactName,
    })
    .from(potluckItem)
    .leftJoin(household, eq(potluckItem.claimedByHouseholdId, household.id))
    .where(eq(potluckItem.reunionId, id))
    .orderBy(asc(potluckItem.sortOrder), asc(potluckItem.createdAt));

  const calendarHref = googleCalendarHref({
    title: found.name,
    startDate: calendarStartDate,
    endDate: calendarEndDate,
    location: found.lockedLocationName ?? null,
  });

  return (
    <main className="kc-plan-page">
      <HeroCountdown reunion={found} dateLabel={dateLabel} />

      <section className="kc-plan-block">
        <div className="kc-plan-section-head">
          <span className="section-eyebrow">The plan</span>
          <h2>
            Mark your calendars, <em>pack the cooler.</em>
          </h2>
        </div>
        <PlanLogisticsCard
          reunion={found}
          dateLabel={dateLabel}
          viewerHousehold={currentHousehold ?? null}
        />
      </section>

      <section className="kc-plan-block">
        <div className="kc-plan-section-head">
          <span className="section-eyebrow">We&apos;ve got a full house</span>
          <h2>
            Who&apos;s <em>coming.</em>
          </h2>
        </div>
        <HouseholdsGrid
          households={attendingHouseholds}
          members={members}
          organizerId={found.organizerId}
        />
      </section>

      <PotluckSection
        reunionId={id}
        initialItems={potluckRows}
        currentHouseholdId={currentHousehold?.id ?? null}
        canClaim={Boolean(currentHousehold)}
      />

      <section className="kc-plan-block">
        <div className="kc-plan-section-head">
          <span className="section-eyebrow">From the group</span>
          <h2>
            Latest <em>updates.</em>
          </h2>
        </div>
        <UpdatesStack updates={updateRows} />
      </section>

      <CloserQuote organizerName={organizer?.name ?? null} />

      <PlanFooter reunionId={id} calendarHref={calendarHref} />
    </main>
  );
}
