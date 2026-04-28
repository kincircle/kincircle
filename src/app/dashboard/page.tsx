import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CreateReunionDialog } from "@/components/reunion/CreateReunionDialog";
import { ReunionCard } from "@/components/reunion/ReunionCard";
import { Plus } from "lucide-react";

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
    .select({ reunion: reunion })
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
    .map((r) => r.reunion)
    .filter((r) => r.organizerId !== session.user.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Reunions</h1>
            <p className="text-muted-foreground mt-1">
              Plan and manage your family reunions
            </p>
          </div>
          <CreateReunionDialog />
        </div>

        {organized.length === 0 && memberOf.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {organized.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Organizing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organized.map((r) => (
                    <ReunionCard key={r.id} reunion={r} isOrganizer />
                  ))}
                </div>
              </section>
            )}
            {memberOf.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Invited To</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memberOf.map((r) => (
                    <ReunionCard key={r.id} reunion={r} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No reunions yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create your first family reunion to start planning dates, locations, and
        inviting your family.
      </p>
      <CreateReunionDialog />
    </div>
  );
}
