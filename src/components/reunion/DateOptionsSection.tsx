"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Trash2,
  Send,
  Loader2,
  Plus,
  Lock,
} from "lucide-react";
import { addDateOption, deleteDateOption, sendVotingReminders } from "@/lib/actions/date";
import { lockDate } from "@/lib/actions/finalize";
import { expectArray, expectArrayField } from "@/lib/response";
import { useRouter } from "next/navigation";

interface VoteTally {
  works: number;
  prefer: number;
  cannot: number;
  total: number;
}

interface DateOptionWithVotes {
  id: string;
  startDate: string;
  endDate: string;
  description: string | null;
  votes: VoteTally;
}

interface DateOptionRow {
  id: string;
  startDate: string;
  endDate: string;
  description: string | null;
  createdAt: string;
}

interface DateOptionsSectionProps {
  reunionId: string;
  embedded?: boolean;
  lockedDateOptionId?: string | null;
  canLockDate?: boolean;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
  }
  if (startDay !== endDay) {
    return `${startMonth} ${startDay} - ${endDay}, ${endYear}`;
  }
  return `${startMonth} ${startDay}, ${endYear}`;
}

function supportCount(votes: VoteTally): number {
  return votes.prefer + votes.works;
}

export function DateOptionsSection({
  reunionId,
  embedded = false,
  lockedDateOptionId = null,
  canLockDate = false,
}: DateOptionsSectionProps) {
  const router = useRouter();
  const [dateOptions, setDateOptions] = useState<DateOptionRow[]>([]);
  const [votesData, setVotesData] = useState<DateOptionWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [datesRes, votesRes] = await Promise.all([
        fetch(`/api/reunions/${reunionId}/dates`),
        fetch(`/api/reunions/${reunionId}/votes`),
      ]);

      if (datesRes.ok) {
        const dates = expectArray<DateOptionRow>(
          await datesRes.json(),
          "reunion date options"
        );
        setDateOptions(dates);
      }

      if (votesRes.ok) {
        const votes = expectArrayField<unknown>(
          await votesRes.json(),
          "dateOptions",
          "reunion vote summary"
        );
        const normalizedVotes = votes.map((option) => {
          const candidate =
            typeof option === "object" && option !== null
              ? (option as Record<string, unknown>)
              : {};
          const voteCounts =
            typeof candidate.votes === "object" && candidate.votes !== null
              ? (candidate.votes as Record<string, unknown>)
              : {};

          return {
            id: typeof candidate.id === "string" ? candidate.id : "",
            startDate:
              typeof candidate.startDate === "string" ? candidate.startDate : "",
            endDate:
              typeof candidate.endDate === "string" ? candidate.endDate : "",
            description:
              typeof candidate.description === "string"
                ? candidate.description
                : null,
            votes: {
              works: typeof voteCounts.works === "number" ? voteCounts.works : 0,
              prefer:
                typeof voteCounts.prefer === "number" ? voteCounts.prefer : 0,
              cannot:
                typeof voteCounts.cannot === "number" ? voteCounts.cannot : 0,
              total:
                typeof voteCounts.total === "number"
                  ? voteCounts.total
                  : typeof candidate.total === "number"
                    ? candidate.total
                    : 0,
            },
          };
        });
        setVotesData(normalizedVotes.filter((option) => option.id));
      }
    } catch (error) {
      toast.error("Failed to load date options");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [reunionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    setAdding(true);
    try {
      await addDateOption(reunionId, {
        startDate,
        endDate,
        description: description || undefined,
      });
      toast.success("Date option added");
      setStartDate("");
      setEndDate("");
      setDescription("");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add date option");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (dateOptionId: string) => {
    setDeleting(dateOptionId);
    try {
      await deleteDateOption(dateOptionId);
      toast.success("Date option removed");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete date option");
    } finally {
      setDeleting(null);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const result = await sendVotingReminders(reunionId);
      toast.success(`Voting reminders sent to ${result.sent} household${result.sent !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  const handleLockDate = async (dateOptionId: string) => {
    setLockingId(dateOptionId);
    try {
      await lockDate(reunionId, dateOptionId);
      toast.success("Date locked successfully");
      router.refresh();
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to lock date");
    } finally {
      setLockingId(null);
    }
  };

  // Find the winning option (highest prefer + works count)
  const winningId = votesData.length > 0
    ? votesData.reduce((best, opt) => {
        const bestScore = (best.votes.prefer * 2) + best.votes.works;
        const optScore = (opt.votes.prefer * 2) + opt.votes.works;
        return optScore > bestScore ? opt : best;
      }).id
    : null;

  const atLimit = dateOptions.length >= 4;
  const maxSupportCount = Math.max(
    0,
    ...dateOptions.map((opt) => {
      const tally = votesData.find((v) => v.id === opt.id);
      return supportCount(
        tally?.votes ?? { prefer: 0, works: 0, cannot: 0, total: 0 }
      );
    })
  );

  if (loading) {
    return (
      <div className={embedded ? "" : "card"}>
        <div className="muted flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2">Loading date options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "card space-y-6"}>
      {!embedded && (
        <div className="between flex-col items-start sm:flex-row sm:items-start">
          <div>
            <span className="section-eyebrow">Step 2</span>
            <div className="row">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
                <Calendar className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xl">Pick a date</h3>
                <p className="muted text-sm">
                  Add up to 4 date options and watch the household vote tally.
                </p>
              </div>
            </div>
          </div>
          {dateOptions.length > 0 && (
            <button
              type="button"
              className="btn secondary sm disabled:pointer-events-none disabled:opacity-50"
              onClick={handleSendReminders}
              disabled={sendingReminders}
            >
              {sendingReminders ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Reminders
            </button>
          )}
        </div>
      )}

      {embedded && dateOptions.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn secondary sm disabled:pointer-events-none disabled:opacity-50"
            onClick={handleSendReminders}
            disabled={sendingReminders}
          >
            {sendingReminders ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Reminders
          </button>
        </div>
      )}

      {!atLimit && (
        <form
          className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-warm)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAdd();
          }}
        >
          <div className="between flex-col items-start sm:flex-row sm:items-center">
            <div>
              <p className="font-medium">Add a date option</p>
              <p className="muted text-sm">
                Candidate weekends work best for household voting.
              </p>
            </div>
            <span className="badge muted">
              {dateOptions.length} of 4 options
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="start-date">
                Start Date
              </label>
              <input
                id="start-date"
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="end-date">
                End Date
              </label>
              <input
                id="end-date"
                className="input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="date-description">
              Description (optional)
            </label>
            <input
              id="date-description"
              className="input"
              placeholder="e.g., Memorial Day weekend"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn primary sm disabled:pointer-events-none disabled:opacity-50"
            disabled={adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Date Option
          </button>
        </form>
      )}

      {atLimit && (
        <p className="muted rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-warm)] px-4 py-3 text-sm">
          Maximum of 4 date options reached.
        </p>
      )}

      <div>
        <div className="between mb-3">
          <div>
            <p className="label mb-0">Date Options ({dateOptions.length})</p>
            <p className="muted text-sm">
              The leading card is based on prefer votes plus available votes.
            </p>
          </div>
        </div>

        {dateOptions.length === 0 ? (
          <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
            No date options added yet. Add your first option above.
          </p>
        ) : (
          <div className="date-options">
            {dateOptions.map((opt) => {
              const tally = votesData.find((v) => v.id === opt.id);
              const votes = tally?.votes ?? {
                prefer: 0,
                works: 0,
                cannot: 0,
                total: 0,
              };
              const isWinning = opt.id === winningId && votes.total > 0;
              const optionSupportCount = supportCount(votes);
              const barWidth =
                maxSupportCount > 0
                  ? Math.round((optionSupportCount / maxSupportCount) * 100)
                  : 0;
              const dateLabel = formatDateRange(opt.startDate, opt.endDate);

              return (
                <div
                  key={opt.id}
                  className={`date-option${isWinning ? " winner" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="date-info">
                        <span className="day">{dateLabel}</span>
                        <span className="date-detail">
                          {opt.description ?? "No note added"}
                        </span>
                      </div>
                      {isWinning && (
                        <span className="badge">Leading</span>
                      )}
                      {opt.id === lockedDateOptionId && (
                        <span className="badge sage">Locked</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="status-badge status-voted">
                        {votes.prefer} prefer
                      </span>
                      <span className="status-badge status-sage">
                        {votes.works} works
                      </span>
                      <span className="status-badge bg-[var(--destructive-soft)] text-[var(--destructive)]">
                        {votes.cannot} can&apos;t
                      </span>
                      {votes.total > 0 && (
                        <span className="muted text-xs">
                          {votes.total} total vote{votes.total !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div
                      className="vote-bar"
                      aria-label={`${optionSupportCount} supporting votes`}
                    >
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="vote-count">{optionSupportCount}</span>
                    </div>

                    {canLockDate && !lockedDateOptionId && (
                      <button
                        type="button"
                        className="btn primary sm disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => void handleLockDate(opt.id)}
                        disabled={lockingId === opt.id}
                      >
                        {lockingId === opt.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        Lock it in
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label={`Delete date option ${dateLabel}`}
                      className="btn ghost sm h-8 w-8 px-0 text-[var(--ink-soft)] hover:text-[var(--destructive)] disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => void handleDelete(opt.id)}
                      disabled={deleting === opt.id}
                    >
                      {deleting === opt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
