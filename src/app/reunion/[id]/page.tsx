import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InviteSection } from "@/components/reunion/InviteSection";
import { HouseholdList } from "@/components/reunion/HouseholdList";
import { DateOptionsSection } from "@/components/reunion/DateOptionsSection";
import { VotingSection } from "@/components/reunion/VotingSection";
import { LocationSection } from "@/components/reunion/LocationSection";
import { StatusSection } from "@/components/reunion/StatusSection";
import { UpdatesSection } from "@/components/reunion/UpdatesSection";
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{found.name}</h1>
            {found.description && (
              <p className="text-muted-foreground mt-2">{found.description}</p>
            )}
          </div>
          <Badge variant={statusVariants[found.status]}>
            {statusLabels[found.status]}
          </Badge>
        </div>

        {isOrganizer && (
          <div className="text-sm text-muted-foreground mb-4">
            You are the organizer of this reunion.
          </div>
        )}

        {householdCount > 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            {respondedCount} of {householdCount} household
            {householdCount !== 1 ? "s" : ""} have responded
          </p>
        )}

        {isOrganizer && (
          <>
            <Separator className="my-6" />
            <StatusSection reunionId={id} currentStatus={found.status} />

            <Separator className="my-6" />
            <InviteSection reunionId={id} />

            <Separator className="my-6" />
            <HouseholdList reunionId={id} />

            <Separator className="my-6" />
            <DateOptionsSection reunionId={id} />

            <Separator className="my-6" />
            <LocationSection reunionId={id} />

            <Separator className="my-6" />
            <UpdatesSection reunionId={id} isOrganizer={true} />
          </>
        )}

        {!isOrganizer && (
          <>
            <Separator className="my-6" />
            <VotingSection reunionId={id} />

            <Separator className="my-6" />
            <LocationSection reunionId={id} />

            <Separator className="my-6" />
            <UpdatesSection reunionId={id} isOrganizer={false} />
          </>
        )}
      </main>
    </div>
  );
}
