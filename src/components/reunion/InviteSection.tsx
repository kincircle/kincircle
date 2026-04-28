"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sendInvites, revokeInvite } from "@/lib/actions/invite";
import { expectArray } from "@/lib/response";
import { toast } from "sonner";
import { Loader2, Send, X, Mail } from "lucide-react";
import type { Invite } from "@/types";

interface InviteSectionProps {
  reunionId: string;
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

  function statusBadgeVariant(
    status: string
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "accepted":
        return "default";
      case "pending":
        return "secondary";
      case "revoked":
        return "destructive";
      default:
        return "outline";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invitations
        </CardTitle>
        <CardDescription>
          Send email invitations to family members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Send invites form */}
        <div className="space-y-2">
          <Label htmlFor="emails">Email Addresses</Label>
          <Textarea
            id="emails"
            placeholder={"Enter email addresses separated by commas or new lines\ne.g. aunt.jane@email.com, uncle.bob@email.com"}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleSendInvites}
            disabled={sending || !emailInput.trim()}
            size="sm"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invites
              </>
            )}
          </Button>
        </div>

        {/* Sent invites list */}
        {invites.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Sent Invitations ({invites.length})</Label>
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm">{invite.email}</span>
                      <Badge variant={statusBadgeVariant(invite.status)}>
                        {invite.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                      {invite.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevoke(invite.id)}
                          disabled={revokingId === invite.id}
                        >
                          {revokingId === invite.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading invites...
          </div>
        )}

        {!loading && invites.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            No invitations sent yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
