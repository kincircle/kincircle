import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
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

function statusCopy(status: string) {
  if (status === "date_locked") return "Date locked";
  if (status === "finalized") return "Finalized";
  if (status === "cancelled") return "Cancelled";
  return "Planning";
}

function progressFor(card: ReunionCardView) {
  if (card.reunion.status === "finalized") return 100;
  if (card.reunion.status === "date_locked" && card.reunion.lockedLocationName) {
    return 80;
  }
  if (card.reunion.status === "date_locked") return 70;
  if (card.dateOptionCount > 0 && card.respondedCount > 0) return 45;
  if (card.householdCount > 0) return 30;
  return 12;
}

function nextStepCopy(card: ReunionCardView) {
  if (card.reunion.status === "finalized") return "Finalized - see plan";
  if (card.reunion.status === "date_locked" && card.reunion.lockedLocationName) {
    return "Step 4 of 4 - finalize reunion";
  }
  if (card.reunion.status === "date_locked") return "Step 3 of 4 - pick a location";
  if (card.dateOptionCount > 0) return "Step 2 of 4 - date voting open";
  return "Step 1 of 4 - collecting RSVPs";
}

function reunionHref(card: ReunionCardView) {
  return card.reunion.status === "finalized"
    ? `/reunion/${card.reunion.id}/plan`
    : `/reunion/${card.reunion.id}`;
}

function metaCopy(card: ReunionCardView) {
  if (card.role === "organizer") {
    return `Hosted by you - ${card.householdCount} household${
      card.householdCount === 1 ? "" : "s"
    } - est. ${card.totalPartySize} people`;
  }

  const partySize = card.memberHousehold?.partySize ?? 1;
  const rsvp = card.memberHousehold?.rsvpStatus;
  const response =
    rsvp === "yes"
      ? `you said yes for ${partySize}`
      : rsvp === "maybe"
        ? `you said maybe for ${partySize}`
        : rsvp === "no"
          ? "you cannot make it"
          : "RSVP pending";
  return `Member - ${response}`;
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

      return {
        ...card,
        householdCount: households.length,
        respondedCount: households.filter((h) => h.rsvpStatus !== "pending").length,
        totalPartySize,
        dateOptionCount: dateOptions.length,
        imageUrl:
          card.reunion.heroImageUrl ||
          CARD_IMAGES[index % CARD_IMAGES.length],
      };
    })
  );

  const heroCard = cards[0];
  const displayName = firstName(session.user.name, session.user.email);
  const pendingCount = heroCard
    ? Math.max(heroCard.householdCount - heroCard.respondedCount, 0)
    : 0;

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
            <p>
              {heroCard
                ? `${heroCard.reunion.name} is in motion - ${pendingCount} household${
                    pendingCount === 1 ? "" : "s"
                  } still need to RSVP.`
                : "Start your first reunion and get the family moving from scattered texts to one shared plan."}
            </p>
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
          where everyone lives once households share their city and state.
        </div>
      </main>
    </div>
  );
}

function ReunionCardItem({ card }: { card: ReunionCardView }) {
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
          <span
            className={`badge dot${
              card.reunion.status === "date_locked" ||
              card.reunion.status === "finalized"
                ? " sage"
                : card.role === "member"
                  ? " muted"
                  : ""
            }`}
          >
            {card.role === "member" && card.reunion.status === "planning"
              ? "Member"
              : statusCopy(card.reunion.status)}
          </span>
          <small>{formatDateLabel(card)}</small>
        </div>
        <h3>{card.reunion.name}</h3>
        <p className="muted">{metaCopy(card)}</p>
        <div className="kc-dashboard-progress" aria-hidden="true">
          <span
            style={{
              width: `${progressFor(card)}%`,
              background:
                card.reunion.status === "finalized"
                  ? "var(--sage)"
                  : undefined,
            }}
          />
        </div>
        <small>{nextStepCopy(card)}</small>
      </div>
    </Link>
  );
}
