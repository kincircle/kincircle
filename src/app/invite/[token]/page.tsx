"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RsvpStatus = "yes" | "maybe" | "no";
type VoteChoice = "works" | "prefer" | "cannot";

interface MemberRow {
  id: string;
  name: string;
  ageGroup: "adult" | "child";
  age: string;
}

interface InviteData {
  reunion: {
    name: string;
    description: string | null;
    heroImageUrl: string | null;
  };
  invite: { email: string; householdName: string | null; invitedBy?: string | null };
  reunionId: string;
  dateOptions: {
    id: string;
    startDate: string;
    endDate: string;
    description: string | null;
  }[];
}

const FALLBACK_INVITE_IMAGE =
  "/images/Kids_grandparents_family_reunion_4a2cad3fce.jpeg";

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const year = start.getFullYear();

  if (startDate === endDate) {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (startMonth !== endMonth) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  }

  return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
}

function formatDateSubtext(startDate: string, endDate: string, description: string | null) {
  if (description) return description;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startWeekday = start.toLocaleDateString("en-US", { weekday: "long" });
  const endWeekday = end.toLocaleDateString("en-US", { weekday: "long" });
  return startDate === endDate ? startWeekday : `${startWeekday} - ${endWeekday}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [dietaryNeeds, setDietaryNeeds] = useState("");
  const [arrivalNotes, setArrivalNotes] = useState("");
  const [departureNotes, setDepartureNotes] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [dateVotes, setDateVotes] = useState<Record<string, VoteChoice>>({});

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
        partySize: 1 + members.filter((m) => m.name.trim()).length,
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
        dateVotes: Object.entries(dateVotes).map(([dateOptionId, vote]) => ({
          dateOptionId,
          vote,
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
      <div className="kc-invite-status">
        <div>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="kc-invite-status">
        <div className="kc-invite-message-card">
          <AlertCircle className="mx-auto h-7 w-7 text-[var(--destructive)]" />
          <h1>Invitation unavailable</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="kc-invite-status">
        <div className="kc-invite-message-card">
          <CheckCircle2 className="mx-auto h-9 w-9 text-[var(--sage)]" />
          <h1>RSVP submitted</h1>
          <p>
            Thank you for responding to the {inviteData?.reunion.name} reunion.
            The organizer will be in touch with more details.
          </p>
        </div>
      </div>
    );
  }

  if (!inviteData) return null;

  const rsvpOptions: {
    value: RsvpStatus;
    title: string;
    subtitle: string;
    icon: ReactNode;
  }[] = [
    {
      value: "yes",
      title: "Yes, we're in",
      subtitle: "Excited to celebrate",
      icon: <Check className="h-[18px] w-[18px]" />,
    },
    {
      value: "maybe",
      title: "Maybe",
      subtitle: "Holding the date",
      icon: <HelpCircle className="h-[18px] w-[18px]" />,
    },
    {
      value: "no",
      title: "Can't make it",
      subtitle: "We'll be there in spirit",
      icon: <X className="h-[18px] w-[18px]" />,
    },
  ];

  const heroImage = inviteData.reunion.heroImageUrl || FALLBACK_INVITE_IMAGE;
  const invitedAs = inviteData.invite.householdName || inviteData.invite.email;
  const hostName = inviteData.invite.invitedBy || "KinCircle";
  const hostInitials = getInitials(hostName);

  return (
    <div className="kc-invite-page">
      <div className="kc-invite-shell">
        <section className="kc-invite-hero">
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="(min-width: 720px) 720px, 100vw"
            unoptimized={heroImage.startsWith("http")}
            className="object-cover"
          />
          <div className="kc-invite-hero-content">
            <div className="kc-invite-host">
              <span className="avatar">{hostInitials}</span>
              <span style={{ color: "oklch(0.95 0.01 85)", fontSize: "0.95rem" }}>
                {hostName} invited you to
              </span>
            </div>
            <h1>{inviteData.reunion.name}</h1>
          </div>
        </section>

        <form className="kc-invite-card" onSubmit={handleSubmit}>

          <div className="kc-invite-you">
            <small>You&apos;re invited as</small>
            <h2 style={{ marginTop: "0.25rem", fontStyle: "italic" }}>{invitedAs}</h2>
            {inviteData.reunion.description && (
              <p>{inviteData.reunion.description}</p>
            )}
          </div>

          {error && <div className="kc-form-error">{error}</div>}

          <h3 className="kc-invite-section-title">Who should we contact?</h3>
          <label className="kc-field">
            <span>Your name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
            />
          </label>

          <h3 className="kc-invite-section-title">Can you make it?</h3>
          <div className="kc-rsvp-row">
            {rsvpOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn("kc-rsvp", rsvp === option.value && "selected")}
                onClick={() => setRsvp(option.value)}
                aria-pressed={rsvp === option.value}
              >
                <span className="kc-rsvp-icon">{option.icon}</span>
                <h4>{option.title}</h4>
                <small>{option.subtitle}</small>
              </button>
            ))}
          </div>

          <h3 className="kc-invite-section-title">Who&apos;s coming with you?</h3>
          <p className="kc-invite-help">Add each person so we can plan food and seating.</p>

          <div className="kc-members" style={{ marginTop: "0.85rem" }}>
            {members.map((member) => (
              <div
                key={member.id}
                className="kc-member-row"
                style={{ gridTemplateColumns: "minmax(0, 1fr) 140px auto" }}
              >
                <input
                  value={member.name}
                  onChange={(event) =>
                    updateMember(member.id, "name", event.target.value)
                  }
                  placeholder="Member name"
                />
                <select
                  value={member.ageGroup}
                  onChange={(event) =>
                    updateMember(member.id, "ageGroup", event.target.value)
                  }
                >
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                </select>
                <button
                  type="button"
                  aria-label={`Remove ${member.name || "member"}`}
                  onClick={() => removeMember(member.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn ghost sm"
            style={{ marginTop: "0.75rem" }}
            onClick={addMember}
          >
            <Plus className="h-3.5 w-3.5" />
            Add another person
          </button>

          <h3 className="kc-invite-section-title" style={{ fontStyle: "italic" }}>
            Where are you traveling from?
          </h3>
          <p className="kc-invite-help">
            We use this to suggest a location everyone can reach. Only your city
            is shown to other households.
          </p>
          <div className="kc-location-grid" style={{ marginTop: "0.85rem" }}>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="City"
            />
            <input
              value={state}
              onChange={(event) => setState(event.target.value)}
              placeholder="State"
            />
            <input
              value={zip}
              onChange={(event) => setZip(event.target.value)}
              placeholder="Zip"
            />
          </div>

          {inviteData.dateOptions.length > 0 && (
            <>
              <h3 className="kc-invite-section-title">Which dates work for you?</h3>
              <div className="kc-date-vote-list">
                {inviteData.dateOptions.map((option) => (
                  <div key={option.id} className="kc-date-vote">
                    <div className="kc-date-when">
                      <div>{formatDateRange(option.startDate, option.endDate)}</div>
                      <small>
                        {formatDateSubtext(
                          option.startDate,
                          option.endDate,
                          option.description
                        )}
                      </small>
                    </div>
                    <div className="kc-vote-buttons">
                      {(
                        [
                          ["works", "Works"],
                          ["prefer", "Prefer"],
                          ["cannot", "Can't"],
                        ] as const
                      ).map(([choice, label]) => (
                        <button
                          key={choice}
                          type="button"
                          className={cn(
                            "kc-vote-btn",
                            dateVotes[option.id] === choice && "selected",
                            dateVotes[option.id] === choice &&
                              choice === "cannot" && "cant",
                            dateVotes[option.id] === choice &&
                              choice !== "cannot" && choice
                          )}
                          onClick={() =>
                            setDateVotes((prev) => ({
                              ...prev,
                              [option.id]: choice as VoteChoice,
                            }))
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="kc-invite-section-title">Anything the host should know?</h3>
          <div className="kc-notes-grid">
            <label className="kc-field">
              <span>Dietary needs</span>
              <textarea
                value={dietaryNeeds}
                onChange={(event) => setDietaryNeeds(event.target.value)}
                placeholder="Allergies or restrictions"
                rows={2}
              />
            </label>
            <label className="kc-field">
              <span>Arrival notes</span>
              <textarea
                value={arrivalNotes}
                onChange={(event) => setArrivalNotes(event.target.value)}
                placeholder="When do you plan to arrive?"
                rows={2}
              />
            </label>
            <label className="kc-field">
              <span>Departure notes</span>
              <textarea
                value={departureNotes}
                onChange={(event) => setDepartureNotes(event.target.value)}
                placeholder="When do you plan to leave?"
                rows={2}
              />
            </label>
          </div>

          <div className="kc-invite-footer-cta">
            <small>You can update this later. We&apos;ll send your household a confirmation.</small>
            <button
              type="submit"
              className="btn primary"
              disabled={!name.trim() || !rsvp || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send my response
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
