"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HouseholdDialog, type HouseholdWithMembers } from "./HouseholdDialog";
import { deleteHousehold, sendHouseholdInvite } from "@/lib/actions/household";
import { expectArray, isRecord } from "@/lib/response";
import { Loader2, Mail, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { HouseholdMember } from "@/types";

interface HouseholdListProps {
  reunionId: string;
  /** The reunion organizer's user ID. When provided, the household whose
   *  `claimedByUserId` matches this value gets a "Hosting" badge. */
  organizerId?: string;
}

interface HouseholdStatus {
  className: string;
  label: string;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function householdInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function locationLabel(household: HouseholdWithMembers) {
  return [household.city, household.state].filter(Boolean).join(", ");
}

function householdMeta(household: HouseholdWithMembers) {
  const location = locationLabel(household);

  if (household.members.length === 0) {
    return location || household.primaryContactEmail || pluralize(household.partySize, "guest");
  }

  const adultCount =
    1 + household.members.filter((member) => member.ageGroup === "adult").length;
  const childCount = household.members.filter(
    (member) => member.ageGroup === "child"
  ).length;
  const people = [pluralize(adultCount, "adult")];
  if (childCount > 0) {
    people.push(pluralize(childCount, "child", "children"));
  }

  return [people.join(", "), location].filter(Boolean).join(" · ");
}

function isOrganizerHousehold(
  household: HouseholdWithMembers,
  organizerId?: string
) {
  return Boolean(organizerId && household.claimedByUserId === organizerId);
}

function shouldShowResend(
  household: HouseholdWithMembers,
  organizerId?: string
) {
  return (
    !isOrganizerHousehold(household, organizerId) &&
    household.invitationStatus === "pending" &&
    !household.claimedAt &&
    !household.claimedByUserId
  );
}

function householdStatus(
  household: HouseholdWithMembers,
  organizerId?: string
): HouseholdStatus {
  if (isOrganizerHousehold(household, organizerId)) {
    return { className: "badge sage", label: "Hosting" };
  }

  if (household.rsvpStatus === "yes") {
    return {
      className: "badge sage",
      label: `Yes · ${household.partySize}`,
    };
  }
  if (household.rsvpStatus === "maybe") {
    return { className: "badge", label: "Maybe" };
  }
  if (household.rsvpStatus === "no") {
    return { className: "badge muted", label: "Can't make it" };
  }
  if (!household.claimedAt && household.invitationStatus === "not_sent") {
    return { className: "badge muted", label: "?" };
  }
  if (household.invitationStatus === "revoked") {
    return { className: "badge muted", label: "Revoked" };
  }
  if (household.invitationStatus === "expired") {
    return { className: "badge muted", label: "Expired" };
  }

  return { className: "badge muted", label: "Pending" };
}

export function HouseholdList({ reunionId, organizerId }: HouseholdListProps) {
  const router = useRouter();
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeHousehold, setActiveHousehold] =
    useState<HouseholdWithMembers | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHouseholds = useCallback(async () => {
    try {
      const response = await fetch(`/api/reunions/${reunionId}/households`);
      if (!response.ok) {
        throw new Error("Failed to fetch households");
      }

      const data = expectArray<unknown>(
        await response.json(),
        "reunion households"
      );

      const nextHouseholds = data
        .filter(isRecord)
        .map((item) => ({
          ...(item as unknown as HouseholdWithMembers),
          members: Array.isArray(item.members)
            ? (item.members as HouseholdMember[])
            : [],
        }));

      setHouseholds(nextHouseholds);
    } catch (error) {
      toast.error("Failed to load households");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [reunionId]);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  async function refreshData() {
    await fetchHouseholds();
    router.refresh();
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    setDialogOpen(nextOpen);
    if (!nextOpen) {
      setActiveHousehold(null);
    }
  }

  function handleAddHousehold() {
    setActiveHousehold(null);
    setDialogOpen(true);
  }

  function handleEditHousehold(household: HouseholdWithMembers) {
    setActiveHousehold(household);
    setDialogOpen(true);
  }

  async function handleSendInvite(household: HouseholdWithMembers) {
    setInvitingId(household.id);
    try {
      const result = await sendHouseholdInvite(household.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Invite sent");
        await refreshData();
      }
    } catch (error) {
      toast.error("Failed to send invite");
      console.error(error);
    } finally {
      setInvitingId(null);
    }
  }

  async function handleDeleteHousehold(household: HouseholdWithMembers) {
    const confirmed = window.confirm(
      `Delete the ${household.primaryContactName} household? This will remove all household members and linked invites.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(household.id);
    try {
      await deleteHousehold(household.id);
      toast.success("Household deleted");
      await refreshData();
    } catch (error) {
      toast.error("Failed to delete household");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="muted flex items-center justify-center py-8">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading households...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="between flex-col items-start sm:flex-row sm:items-center">
          <div>
            <span className="section-eyebrow">Guest list</span>
            <div className="row">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
                <Users className="h-4 w-4" />
              </span>
              <h3 className="text-xl">Households</h3>
              <span className="badge muted">{households.length}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn secondary sm"
            onClick={handleAddHousehold}
          >
            <Plus className="h-4 w-4" />
            Add household
          </button>
        </div>

        <hr className="divider" />

        {households.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto h-10 w-10 text-[var(--ink-soft)] opacity-40" />
            <p className="muted mt-2 text-sm">
              No households yet. Add one to start managing attendees directly.
            </p>
          </div>
        ) : (
          <div>
            {households.map((household) => {
              const status = householdStatus(household, organizerId);
              const showResend = shouldShowResend(household, organizerId);

              return (
                <div className="household-row" key={household.id}>
                  <button
                    type="button"
                    className="household-row-main"
                    onClick={() => handleEditHousehold(household)}
                    aria-label={`Edit ${household.primaryContactName}`}
                  >
                    <span
                      className={
                        showResend ? "avatar muted household-avatar-pending" : "avatar"
                      }
                    >
                      {showResend
                        ? "?"
                        : householdInitials(household.primaryContactName)}
                    </span>
                    <span className="who">
                      <span
                        className={
                          household.rsvpStatus === "no"
                            ? "household-name line-through"
                            : "household-name"
                        }
                      >
                        {household.primaryContactName}
                      </span>
                      <small className="muted">{householdMeta(household)}</small>
                    </span>
                  </button>

                  <div className="household-row-actions">
                    {showResend ? (
                      <button
                        type="button"
                        className="btn ghost sm disabled:pointer-events-none disabled:opacity-50"
                        disabled={
                          !household.primaryContactEmail ||
                          invitingId === household.id ||
                          deletingId === household.id
                        }
                        onClick={() => handleSendInvite(household)}
                      >
                        {invitingId === household.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Resend
                      </button>
                    ) : (
                      <span className={status.className}>{status.label}</span>
                    )}

                    <button
                      type="button"
                      className="btn ghost sm h-8 w-8 px-0 text-[var(--ink-soft)] hover:text-[var(--destructive)] disabled:pointer-events-none disabled:opacity-50"
                      disabled={deletingId === household.id}
                      onClick={() => handleDeleteHousehold(household)}
                      aria-label={`Delete ${household.primaryContactName}`}
                    >
                      {deletingId === household.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <HouseholdDialog
        reunionId={reunionId}
        household={activeHousehold}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSaved={refreshData}
      />
    </>
  );
}
