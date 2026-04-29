"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HouseholdDialog, type HouseholdWithMembers } from "./HouseholdDialog";
import { deleteHousehold, sendHouseholdInvite } from "@/lib/actions/household";
import { expectArray, isRecord } from "@/lib/response";
import {
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { HouseholdMember } from "@/types";

interface HouseholdListProps {
  reunionId: string;
  /** The reunion organizer's user ID. When provided, the household whose
   *  `claimedByUserId` matches this value gets a "Hosting" badge. */
  organizerId?: string;
}

// Returns the primary status badge for a household row using design-system badge classes.
// Priority: rsvp status > invitation status (pending = no rsvp yet).
function householdBadge(household: HouseholdWithMembers): { className: string; label: string } | null {
  const { rsvpStatus, invitationStatus } = household;

  if (rsvpStatus === "yes") {
    return { className: "badge sage", label: "Coming" };
  }
  if (rsvpStatus === "maybe") {
    return { className: "badge", label: "Maybe" };
  }
  if (rsvpStatus === "no") {
    // rsvp "no" → muted / no badge; handled inline with strikethrough text
    return null;
  }
  // rsvp still pending — show invite status
  if (invitationStatus === "pending") {
    return { className: "badge muted", label: "Pending" };
  }
  if (invitationStatus === "accepted") {
    // claimed row — status text carries the message; no extra badge needed
    return null;
  }
  if (invitationStatus === "not_sent") {
    return { className: "badge muted", label: "Not sent" };
  }
  if (invitationStatus === "revoked" || invitationStatus === "expired") {
    return { className: "badge muted", label: invitationStatus === "revoked" ? "Revoked" : "Expired" };
  }
  return null;
}

function rsvpBadgeClass(status: string) {
  switch (status) {
    case "yes":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
    case "no":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
    case "maybe":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800";
  }
}

function rsvpLabel(status: string) {
  switch (status) {
    case "yes":
      return "Attending";
    case "no":
      return "Not Attending";
    case "maybe":
      return "Maybe";
    default:
      return "Pending";
  }
}

function inviteBadgeClass(status: string) {
  switch (status) {
    case "accepted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "pending":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800";
    case "revoked":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
    case "expired":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800";
  }
}

function invitationLabel(status: string) {
  switch (status) {
    case "not_sent":
      return "Not sent";
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}


function organizerSourceLabel(household: HouseholdWithMembers) {
  return household.createdBy ? "Organizer added" : "Self-registered";
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
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading households...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Households ({households.length})
              </CardTitle>
              <CardDescription>
                Manage organizer-created households, RSVP households, and
                invitations.
              </CardDescription>
            </div>
            <Button onClick={handleAddHousehold}>
              <Plus className="h-4 w-4" />
              Add Household
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {households.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No households yet. Add one to start managing attendees directly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {households.map((household) => (
                <div
                  key={household.id}
                  className="rounded-lg border p-4 space-y-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            household.rsvpStatus === "no"
                              ? "font-medium truncate line-through text-muted-foreground"
                              : "font-medium truncate"
                          }
                        >
                          {household.primaryContactName}
                        </span>
                        {/* Design-system primary badge: Hosting (organizer's household) */}
                        {organizerId && household.claimedByUserId === organizerId && (
                          <span className="badge sage">Hosting</span>
                        )}
                        {/* Design-system status badge: Coming / Maybe / Pending etc. */}
                        {(() => {
                          const badge = householdBadge(household);
                          return badge ? (
                            <span className={badge.className}>{badge.label}</span>
                          ) : null;
                        })()}
                        {/* Existing shadcn detail badges (claimed state, source, invite, rsvp) */}
                        {household.claimedAt && (
                          <Badge variant="outline">
                            <UserCheck className="h-3 w-3" />
                            Claimed
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {organizerSourceLabel(household)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={inviteBadgeClass(household.invitationStatus)}
                        >
                          Invite: {invitationLabel(household.invitationStatus)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={rsvpBadgeClass(household.rsvpStatus)}
                        >
                          {rsvpLabel(household.rsvpStatus)}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        {household.primaryContactEmail && (
                          <p className="truncate">{household.primaryContactEmail}</p>
                        )}
                        {household.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {household.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditHousehold(household)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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
                        Send Invite
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === household.id}
                        onClick={() => handleDeleteHousehold(household)}
                      >
                        {deletingId === household.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Party of {household.partySize}</span>
                    {(household.city || household.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[household.city, household.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>

                  {household.members.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Members</p>
                      <div className="space-y-1">
                        {household.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 text-sm text-muted-foreground pl-2"
                          >
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span>{member.name}</span>
                            <span className="text-xs">
                              ({member.ageGroup}
                              {member.age !== null && member.age !== undefined
                                ? `, ${member.age}`
                                : ""}
                              )
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
