"use client";

import { useState, useEffect, useCallback } from "react";
import { sendInvites, revokeInvite } from "@/lib/actions/invite";
import { expectArray } from "@/lib/response";
import { toast } from "sonner";
import { Loader2, Send, X, Mail } from "lucide-react";
import type { Invite } from "@/types";

interface InviteSectionProps {
  reunionId: string;
}

function inviteStatusClass(status: string): string {
  switch (status) {
    case "accepted":
      return "status-badge status-claimed";
    case "pending":
      return "status-badge status-pending";
    case "revoked":
      return "status-badge bg-[var(--destructive-soft)] text-[var(--destructive)]";
    default:
      return "status-badge status-pending";
  }
}

export function InviteSection({ reunionId }: InviteSectionProps) {
  const [emailInput, setEmailInput] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`/api/reunions/${reunionId}/invites`);
      if (!res.ok) {
        throw new Error("Failed to fetch invites");
      }

      const data = expectArray<Invite>(
        await res.json(),
        "reunion invites"
      );
      setInvites(data);
    } catch (error) {
      toast.error("Failed to load invites");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [reunionId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  async function handleSendInvites() {
    const emails = emailInput
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }

    setSending(true);
    try {
      const result = await sendInvites(reunionId, emails);
      if (result.sent > 0) {
        toast.success(`${result.sent} invite${result.sent > 1 ? "s" : ""} sent`);
      }
      if (result.failed.length > 0) {
        toast.error(`Failed to send to: ${result.failed.join(", ")}`);
      }
      setEmailInput("");
      await fetchInvites();
    } catch {
      toast.error("Failed to send invites");
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    setRevokingId(inviteId);
    try {
      await revokeInvite(inviteId);
      toast.success("Invite revoked");
      await fetchInvites();
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  }

  const acceptedCount = invites.filter((invite) => invite.status === "accepted").length;
  const pendingCount = invites.filter((invite) => invite.status === "pending").length;
  const inviteSummary = loading
    ? "Loading invite list..."
    : invites.length > 0
      ? `${invites.length} sent / ${acceptedCount} accepted / ${pendingCount} pending`
      : "0 sent / 0 accepted / 0 pending";

  return (
    <div className="card space-y-5">
      <div className="between flex-col items-start sm:flex-row sm:items-start">
        <div>
          <span className="section-eyebrow">Step 1</span>
          <div className="row">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xl">Invite households</h3>
              <p className="muted text-sm">
                Bulk-paste family emails and track who has accepted.
              </p>
            </div>
          </div>
        </div>
        <span className="badge muted">{inviteSummary}</span>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSendInvites();
        }}
      >
        <div>
          <label className="label" htmlFor="emails">
            Email Addresses
          </label>
          <textarea
            id="emails"
            className="textarea min-h-28 resize-y"
            placeholder={"Enter email addresses separated by commas or new lines\ne.g. aunt.jane@email.com, uncle.bob@email.com"}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            rows={4}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="muted text-sm">
            Separate addresses with commas or line breaks.
          </p>
          <button
            type="submit"
            className="btn primary sm disabled:pointer-events-none disabled:opacity-50"
            disabled={sending || !emailInput.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Invites
              </>
            )}
          </button>
        </div>
      </form>

      {invites.length > 0 && (
        <div>
          <hr className="divider" />
          <div className="between mb-3">
            <div>
              <p className="label mb-0">Sent Invitations ({invites.length})</p>
              <p className="muted text-sm">
                Accepted households can fill in their RSVP and details.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {invite.email}
                  </span>
                  <span className={inviteStatusClass(invite.status)}>
                    {invite.status}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="muted text-xs">
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </span>
                  {invite.status === "pending" && (
                    <button
                      type="button"
                      aria-label={`Revoke invite for ${invite.email}`}
                      className="btn ghost sm h-7 w-7 px-0 text-[var(--ink-soft)] hover:text-[var(--destructive)] disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => void handleRevoke(invite.id)}
                      disabled={revokingId === invite.id}
                    >
                      {revokingId === invite.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="muted flex items-center justify-center py-4">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading invites...
        </div>
      )}

      {!loading && invites.length === 0 && (
        <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
          No invitations sent yet
        </p>
      )}
    </div>
  );
}
