"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { postUpdate, sendUpdateNotification } from "@/lib/actions/finalize";
import { expectArray, isRecord } from "@/lib/response";
import type { ReunionUpdate } from "@/types";

interface UpdatesSectionProps {
  reunionId: string;
  isOrganizer: boolean;
  currentUserId?: string;
}

type UpdateWithAuthor = Omit<ReunionUpdate, "createdAt"> & {
  createdAt: string | Date;
  authorName?: string | null;
};

interface PendingNotification {
  updateId: string;
  total: number;
  sending: boolean;
}

function initials(name: string | null | undefined): string {
  if (!name) return "KC";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatRelative(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function deriveUpdateTitle(message: string): string {
  const firstLine = message.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) return "Announcement";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

function authorLabel(update: UpdateWithAuthor, currentUserId?: string): string {
  if (currentUserId && update.createdBy === currentUserId) {
    return "You";
  }

  return update.authorName?.trim() || "Organizer";
}

export function UpdatesSection({
  reunionId,
  isOrganizer,
  currentUserId,
}: UpdatesSectionProps) {
  const [updates, setUpdates] = useState<UpdateWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [pendingNotification, setPendingNotification] =
    useState<PendingNotification | null>(null);
  const [message, setMessage] = useState("");

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reunions/${reunionId}/updates`);
      if (!res.ok) throw new Error("Failed to fetch updates");
      const json = expectArray<UpdateWithAuthor>(
        await res.json(),
        "reunion updates"
      );
      setUpdates(json);
    } catch (error) {
      toast.error("Failed to load updates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [reunionId]);

  const fetchNotificationRecipientCount = useCallback(async () => {
    const res = await fetch(`/api/reunions/${reunionId}/households`);
    if (!res.ok) {
      throw new Error("Failed to fetch households");
    }

    const data = expectArray<unknown>(await res.json(), "reunion households");
    return data.filter((item) => {
      if (!isRecord(item)) {
        return false;
      }

      return (
        typeof item.primaryContactEmail === "string" &&
        item.primaryContactEmail.trim().length > 0
      );
    }).length;
  }, [reunionId]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    let createdUpdate: ReunionUpdate | null = null;

    try {
      setPosting(true);
      createdUpdate = await postUpdate(
        reunionId,
        deriveUpdateTitle(trimmedMessage),
        trimmedMessage
      );
      toast.success("Update posted");
      setMessage("");
      setPendingNotification(null);
    } catch (error) {
      toast.error("Failed to post update");
      console.error(error);
    } finally {
      setPosting(false);
    }

    if (!createdUpdate) {
      return;
    }

    try {
      await fetchUpdates();

      const eligibleHouseholdCount = await fetchNotificationRecipientCount();
      if (eligibleHouseholdCount > 0) {
        setPendingNotification({
          updateId: createdUpdate.id,
          total: eligibleHouseholdCount,
          sending: false,
        });
      }
    } catch (error) {
      console.error("Failed to prepare update notification prompt:", error);
    }
  }

  async function handleSendNotification() {
    if (!pendingNotification) {
      return;
    }

    try {
      setPendingNotification((current) =>
        current ? { ...current, sending: true } : current
      );

      const result = await sendUpdateNotification(
        reunionId,
        pendingNotification.updateId
      );

      toast.success(`Sent to ${result.sent} of ${result.total} households`);
      setPendingNotification(null);
    } catch (error) {
      toast.error("Failed to send update email notification");
      console.error(error);
      setPendingNotification((current) =>
        current ? { ...current, sending: false } : current
      );
    }
  }

  return (
    <div className="card">
      <h3 className="text-xl">Announcements</h3>
      <p className="muted mt-1 text-sm">Everyone in the reunion sees these.</p>

      {loading && (
        <div className="muted flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && updates.length === 0 && (
        <p className="muted py-4 text-sm">No updates yet.</p>
      )}

      {!loading && updates.length > 0 && (
        <div className="updates-list">
          {updates.map((update) => {
            const name = authorLabel(update, currentUserId);

            return (
              <div className="update" key={update.id}>
                <span className="avatar">
                  {initials(update.authorName ?? name)}
                </span>
                <div className="body">
                  <small>
                    <strong>{name}</strong> &middot;{" "}
                    {formatRelative(update.createdAt)}
                  </small>
                  <p className="whitespace-pre-wrap">{update.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOrganizer && (
        <form onSubmit={handlePost} className="mt-4 space-y-3">
          <textarea
            className="textarea"
            placeholder="Share something with the group..."
            aria-label="Announcement"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            disabled={posting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn sm disabled:pointer-events-none disabled:opacity-50"
              disabled={posting || !message.trim()}
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post update
            </button>
          </div>

          {pendingNotification && (
            <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-warm)] p-4">
              <div>
                <p className="font-medium">
                  Send email notification to {pendingNotification.total} household
                  {pendingNotification.total === 1 ? "" : "s"}?
                </p>
                <p className="muted text-sm">
                  This update is already posted. Choose whether to notify households with email on file.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={pendingNotification.sending}
                  onClick={() => setPendingNotification(null)}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="btn sm disabled:pointer-events-none disabled:opacity-50"
                  disabled={pendingNotification.sending}
                  onClick={handleSendNotification}
                >
                  {pendingNotification.sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
