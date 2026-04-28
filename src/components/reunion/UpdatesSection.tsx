"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { postUpdate, sendUpdateNotification } from "@/lib/actions/finalize";
import { expectArray, isRecord } from "@/lib/response";
import type { ReunionUpdate } from "@/types";

interface UpdatesSectionProps {
  reunionId: string;
  isOrganizer: boolean;
}

interface PendingNotification {
  updateId: string;
  total: number;
  sending: boolean;
}

export function UpdatesSection({ reunionId, isOrganizer }: UpdatesSectionProps) {
  const [updates, setUpdates] = useState<ReunionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [pendingNotification, setPendingNotification] =
    useState<PendingNotification | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reunions/${reunionId}/updates`);
      if (!res.ok) throw new Error("Failed to fetch updates");
      const json = expectArray<ReunionUpdate>(
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
    if (!title.trim() || !message.trim()) return;

    let createdUpdate: ReunionUpdate | null = null;

    try {
      setPosting(true);
      createdUpdate = await postUpdate(reunionId, title.trim(), message.trim());
      toast.success("Update posted");
      setTitle("");
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

  function formatTimestamp(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Updates</CardTitle>
        </div>
        <CardDescription>
          Announcements and news about this reunion
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOrganizer && (
          <form onSubmit={handlePost} className="space-y-3 mb-6">
            <div>
              <Label htmlFor="update-title">Title</Label>
              <Input
                id="update-title"
                placeholder="Update title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={posting}
              />
            </div>
            <div>
              <Label htmlFor="update-message">Message</Label>
              <Textarea
                id="update-message"
                placeholder="Share news with your family..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={posting}
              />
            </div>
            <Button type="submit" disabled={posting || !title.trim() || !message.trim()}>
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Post Update
            </Button>

            {pendingNotification && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="font-medium">
                    Send email notification to {pendingNotification.total} household
                    {pendingNotification.total === 1 ? "" : "s"}?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This update is already posted. Choose whether to notify households with email on file.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendingNotification.sending}
                    onClick={() => setPendingNotification(null)}
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    disabled={pendingNotification.sending}
                    onClick={handleSendNotification}
                  >
                    {pendingNotification.sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && updates.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No updates yet.
          </p>
        )}

        {!loading && updates.length > 0 && (
          <div className="space-y-4">
            {updates.map((update) => (
              <div
                key={update.id}
                className="border-l-2 border-primary/20 pl-4 py-2"
              >
                <p className="font-medium text-sm">{update.title}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {update.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatTimestamp(update.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
