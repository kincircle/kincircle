import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption, user as userTable } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { CreateReunionDialog } from "@/components/reunion/CreateReunionDialog";

const CARD_IMAGES = [
  "/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_118004b7b1.jpeg",
  "/images/Kids_grandparents_family_reunion_4a2cad3fce.jpeg",
  "/images/Hands_passing_dishes_family_reunion_77205c2cd8.jpeg",
  "/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_8fd89a70be.jpeg",
];

type DashboardReunion = typeof reunion.$inferSelect;
type DashboardHousehold = typeof household.$inferSelect;

type ReunionCardView = {
  reunion: DashboardReunion;
  role: "organizer" | "member";
  householdCount: number;
  respondedCount: number;
  totalPartySize: number;
  dateOptionCount: number;
  memberHousehold: DashboardHousehold | null;
  organizerName: string | null;
  organizerEmail: string | null;
  imageUrl: string;
};

function firstName(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) return name.trim().split(/\s+/)[0];
  if (email?.trim()) return email.split("@")[0];
  return "there";
}

function formatDateLabel(card: ReunionCardView) {
  if (card.reunion.lockedDate) {
    return new Date(`${card.reunion.lockedDate}T00:00:00`).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" }
    );
  }
  if (card.dateOptionCount > 0) {
    return `${card.dateOptionCount} date${card.dateOptionCount === 1 ? "" : "s"} open`;
  }
  return "Planning";
}

function statusCopy(status: DashboardReunion["status"]) {
  if (status === "date_locked") return "Date locked";
  if (status === "finalized") return "Finalized";
  if (status === "cancelled") return "Cancelled";
  return "Planning";
}

function badgeFor(card: ReunionCardView) {
  if (card.role === "member") {
    return { label: "Member", className: "badge muted dot" };
  }

  const tone =
    card.reunion.status === "date_locked" || card.reunion.status === "finalized"
      ? " sage"
      : card.reunion.status === "cancelled"
        ? " muted"
        : "";

  return { label: statusCopy(card.reunion.status), className: `badge dot${tone}` };
}

function hasLockedDate(card: ReunionCardView) {
  return Boolean(
    card.reunion.lockedDate ||
      card.reunion.lockedDateOptionId ||
      card.reunion.status === "date_locked" ||
      card.reunion.status === "finalized"
  );
}

function stepFor(card: ReunionCardView) {
  if (card.reunion.status === "finalized") {
    return { caption: "Finalized — see plan", progress: 100, showProgress: true };
  }

  if (card.role === "member") {
    const caption =
      card.reunion.status === "date_locked"
        ? "Date locked — final plan coming soon"
        : "Planning underway";
    return { caption, progress: 0, showProgress: false };
  }

  if (hasLockedDate(card) && card.reunion.lockedLocationName) {
    return { caption: "Step 4 of 4 — send the final plan", progress: 90, showProgress: true };
  }

  if (hasLockedDate(card)) {
    return { caption: "Step 3 of 4 — pick a location", progress: 75, showProgress: true };
  }

  if (card.householdCount > 0) {
    return { caption: "Step 2 of 4 — pick a date", progress: 50, showProgress: true };
  }

  return { caption: "Step 1 of 4 — invite households", progress: 25, showProgress: true };
}

function reunionHref(card: ReunionCardView) {
  return card.reunion.status === "finalized"
    ? `/reunion/${card.reunion.id}/plan`
    : `/reunion/${card.reunion.id}`;
}

function metaCopy(card: ReunionCardView) {
  if (card.role === "organizer") {
    if (card.householdCount === 0) {
      return "Hosted by you · no households invited yet";
    }

    const householdLabel = `${card.householdCount} household${
      card.householdCount === 1 ? "" : "s"
    }${card.reunion.status === "planning" ? " invited" : ""}`;
    const detail =
      card.reunion.status === "planning"
        ? `${card.respondedCount} RSVP${card.respondedCount === 1 ? "" : "s"} in`
        : `est. ${card.totalPartySize} people`;

    return `Hosted by you · ${householdLabel} · ${detail}`;
  }

  const partySize = card.memberHousehold?.partySize ?? 1;
  const rsvp = card.memberHousehold?.rsvpStatus;
  const organizer = firstName(card.organizerName, card.organizerEmail);
  const response =
    rsvp === "yes"
      ? `you said yes for ${partySize}`
      : rsvp === "maybe"
        ? `you said maybe for ${partySize}`
        : rsvp === "no"
        ? "you cannot make it"
        : "RSVP pending";
  return `Hosted by ${organizer} · ${response}`;
}

function weeksUntil(dateString: string | null) {
  if (!dateString) return null;

  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );
}

function heroCopy(card: ReunionCardView | undefined) {
  if (!card) {
    return "Start your first reunion and get the family moving from scattered texts to one shared plan.";
  }

  if (card.reunion.status === "finalized") {
    return `${card.reunion.name} is finalized — everyone has the shared plan.`;
  }

  const pendingCount = Math.max(card.householdCount - card.respondedCount, 0);
  const pendingCopy =
    pendingCount === 0
      ? "everyone has replied"
      : `${pendingCount} household${pendingCount === 1 ? "" : "s"} still need to RSVP`;
  const weekCount = weeksUntil(card.reunion.lockedDate);
  const timing =
    weekCount === null
      ? "is in motion"
      : weekCount === 0
        ? "is this week"
        : `is ${weekCount} week${weekCount === 1 ? "" : "s"} away`;

  return `${card.reunion.name} ${timing} — ${pendingCopy}.`;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // Fetch reunions organized by this user
  const organized = await db
    .select()
    .from(reunion)
    .where(eq(reunion.organizerId, session.user.id))
    .orderBy(desc(reunion.createdAt));

  // Fetch reunions where the user is a member (has a claimed household)
  const memberRows = await db
    .select({ reunion: reunion, household: household })
    .from(reunion)
    .innerJoin(
      household,
      and(
        eq(household.reunionId, reunion.id),
        eq(household.claimedByUserId, session.user.id)
      )
    )
    .orderBy(desc(reunion.createdAt));

  const memberOf = memberRows
    .filter((r) => r.reunion.organizerId !== session.user.id);

  const cardSource = [
    ...organized.map((r) => ({
      reunion: r,
      role: "organizer" as const,
      memberHousehold: null,
    })),
    ...memberOf.map((r) => ({
      reunion: r.reunion,
      role: "member" as const,
      memberHousehold: r.household,
    })),
  ];

  const organizerIds = Array.from(
    new Set(cardSource.map((card) => card.reunion.organizerId))
  );
  const organizerRows = organizerIds.length
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
        })
        .from(userTable)
        .where(inArray(userTable.id, organizerIds))
    : [];
  const organizersById = new Map(
    organizerRows.map((organizer) => [organizer.id, organizer])
  );

  const cards: ReunionCardView[] = await Promise.all(
    cardSource.map(async (card, index) => {
      const [households, dateOptions] = await Promise.all([
        db.select().from(household).where(eq(household.reunionId, card.reunion.id)),
        db
          .select({ id: dateOption.id })
          .from(dateOption)
          .where(eq(dateOption.reunionId, card.reunion.id)),
      ]);
      const totalPartySize = households.reduce(
        (sum, h) => sum + (h.partySize ?? 1),
        0
      );
      const organizer = organizersById.get(card.reunion.organizerId);

      return {
        ...card,
        householdCount: households.length,
        respondedCount: households.filter((h) => h.rsvpStatus !== "pending").length,
        totalPartySize,
        dateOptionCount: dateOptions.length,
        organizerName:
          organizer?.name ??
          (card.role === "organizer" ? session.user.name ?? null : null),
        organizerEmail:
          organizer?.email ??
          (card.role === "organizer" ? session.user.email ?? null : null),
        imageUrl:
          card.reunion.heroImageUrl ||
          CARD_IMAGES[index % CARD_IMAGES.length],
      };
    })
  );

  const heroCard = cards[0];
  const displayName = firstName(session.user.name, session.user.email);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container flex-1 pb-16">
        <section className="kc-dashboard-hero">
          <Image
            src="/images/Hero_image__ratio_169__prompt__a_candid_multigener_8d3011efec.jpeg"
            alt=""
            fill
            priority
            sizes="(min-width: 1200px) 1180px, calc(100vw - 3rem)"
            className="object-cover"
          />
          <div className="kc-dashboard-hero-content">
            <h1>Welcome back, {displayName}</h1>
            <p>{heroCopy(heroCard)}</p>
          </div>
        </section>

        <div className="kc-dashboard-section-head">
          <h2>Your reunions</h2>
          <CreateReunionDialog />
        </div>

        {cards.length === 0 ? (
          <div className="kc-reunion-grid">
            <CreateReunionDialog trigger="card" />
          </div>
        ) : (
          <div className="kc-reunion-grid">
            {cards.map((card) => (
              <ReunionCardItem
                key={`${card.role}-${card.reunion.id}`}
                card={card}
              />
            ))}
            <CreateReunionDialog trigger="card" />
          </div>
        )}

        <div className="kc-dashboard-tip">
          <strong>Tip:</strong> KinCircle suggests a meeting location based on
          where everyone lives once 3+ households share their city and state.
        </div>
      </main>
    </div>
  );
}

function ReunionCardItem({ card }: { card: ReunionCardView }) {
  const badge = badgeFor(card);
  const step = stepFor(card);

  return (
    <Link
      className="kc-reunion-card"
      href={reunionHref(card)}
    >
      <div className="kc-reunion-card-thumb">
        <Image
          src={card.imageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, calc(100vw - 3rem)"
          unoptimized={card.imageUrl.startsWith("http")}
          className="object-cover"
        />
      </div>
      <div className="kc-reunion-card-body">
        <div className="kc-reunion-card-topline">
          <span className={badge.className}>{badge.label}</span>
          <small>{formatDateLabel(card)}</small>
        </div>
        <h3>{card.reunion.name}</h3>
        <p className="muted">{metaCopy(card)}</p>
        {step.showProgress ? (
          <div className="kc-dashboard-progress" aria-hidden="true">
            <span
              style={{
                width: `${step.progress}%`,
                background:
                  card.reunion.status === "finalized"
                    ? "var(--sage)"
                    : undefined,
              }}
            />
          </div>
        ) : null}
        <small>{step.caption}</small>
      </div>
    </Link>
  );
}
