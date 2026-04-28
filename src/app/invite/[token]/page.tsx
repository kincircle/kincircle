"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";

type RsvpStatus = "yes" | "maybe" | "no";

interface MemberRow {
  id: string;
  name: string;
  ageGroup: "adult" | "child";
  age: string;
}

interface InviteData {
  reunion: { name: string; description: string | null };
  invite: { email: string };
  reunionId: string;
}

export default function InviteRsvpPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [dietaryNeeds, setDietaryNeeds] = useState("");
  const [arrivalNotes, setArrivalNotes] = useState("");
  const [departureNotes, setDepartureNotes] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();
        if (data.error) {
          setError(
            data.reason === "expired"
              ? "This invitation has expired."
              : data.reason === "revoked"
                ? "This invitation has been revoked."
                : data.reason === "already_used"
                  ? "This invitation has already been used to RSVP."
                  : data.error
          );
        } else {
          setInviteData(data);
        }
      } catch {
        setError("Failed to load invitation. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  const addMember = useCallback(() => {
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", ageGroup: "adult", age: "" },
    ]);
  }, []);

  const removeMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMember = useCallback(
    (id: string, field: keyof MemberRow, value: string) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
      );
    },
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvp) return;

    setSubmitting(true);
    try {
      const body = {
        name,
        rsvpStatus: rsvp,
        partySize,
        city: city || undefined,
        state: state || undefined,
        zipCode: zip || undefined,
        dietaryNeeds: dietaryNeeds || undefined,
        arrivalNotes: arrivalNotes || undefined,
        departureNotes: departureNotes || undefined,
        members: members
          .filter((m) => m.name.trim())
          .map((m) => ({
            name: m.name,
            ageGroup: m.ageGroup,
            age: m.age ? parseInt(m.age, 10) : undefined,
          })),
      };

      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit RSVP");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invitation Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">RSVP Submitted!</CardTitle>
            <CardDescription>
              Thank you for responding to the {inviteData?.reunion.name}{" "}
              reunion. The organizer will be in touch with more details.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!inviteData) return null;

  const rsvpOptions: { value: RsvpStatus; label: string }[] = [
    { value: "yes", label: "Yes, we'll be there!" },
    { value: "maybe", label: "Maybe" },
    { value: "no", label: "Can't make it" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {inviteData.reunion.name}
          </CardTitle>
          {inviteData.reunion.description && (
            <CardDescription className="mt-1">
              {inviteData.reunion.description}
            </CardDescription>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re invited! Please RSVP below.
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            {/* RSVP Status */}
            <div className="space-y-2">
              <Label>Will you attend? *</Label>
              <div className="grid grid-cols-3 gap-2">
                {rsvpOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRsvp(opt.value)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      rsvp === opt.value
                        ? opt.value === "yes"
                          ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/30 dark:text-green-300"
                          : opt.value === "maybe"
                            ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-300"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Party Size */}
            <div className="space-y-2">
              <Label htmlFor="partySize">Party Size *</Label>
              <Input
                id="partySize"
                type="number"
                min={1}
                max={50}
                value={partySize}
                onChange={(e) =>
                  setPartySize(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                required
              />
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-2">
              <Label>Location (helps with planning)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
                <Input
                  placeholder="Zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
              </div>
            </div>

            {/* Dietary Needs */}
            <div className="space-y-2">
              <Label htmlFor="dietary">Dietary Needs</Label>
              <Textarea
                id="dietary"
                placeholder="Any allergies or dietary restrictions?"
                value={dietaryNeeds}
                onChange={(e) => setDietaryNeeds(e.target.value)}
                rows={2}
              />
            </div>

            {/* Arrival/Departure */}
            <div className="space-y-2">
              <Label htmlFor="arrival">Arrival Notes</Label>
              <Textarea
                id="arrival"
                placeholder="When do you plan to arrive?"
                value={arrivalNotes}
                onChange={(e) => setArrivalNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure">Departure Notes</Label>
              <Textarea
                id="departure"
                placeholder="When do you plan to leave?"
                value={departureNotes}
                onChange={(e) => setDepartureNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            {/* Household Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Household Members</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMember}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Member
                </Button>
              </div>

              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add family members or guests who will attend with you.
                </p>
              )}

              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-start gap-2 rounded-md border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Member name"
                      value={member.name}
                      onChange={(e) =>
                        updateMember(member.id, "name", e.target.value)
                      }
                    />
                    <div className="flex gap-2">
                      <select
                        value={member.ageGroup}
                        onChange={(e) =>
                          updateMember(member.id, "ageGroup", e.target.value)
                        }
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Age"
                        min={0}
                        max={120}
                        value={member.age}
                        onChange={(e) =>
                          updateMember(member.id, "age", e.target.value)
                        }
                        className="w-20"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!name.trim() || !rsvp || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit RSVP"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
