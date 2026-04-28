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
import { toast } from "sonner";
import { expectArray, expectArrayField, expectRecord } from "@/lib/response";
import { Calendar, Loader2, Check } from "lucide-react";
import { submitVotes } from "@/lib/actions/date";
import type { VoteChoice } from "@/types";

interface DateOptionRow {
  id: string;
  startDate: string;
  endDate: string;
  description: string | null;
  createdAt: string;
}

interface HouseholdVote {
  dateOptionId: string;
  vote: VoteChoice;
}

interface HouseholdVotesData {
  householdId: string;
  votes: HouseholdVote[];
}

interface VotingSectionProps {
  reunionId: string;
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

const voteOptions: { value: VoteChoice; label: string; activeClass: string }[] = [
  {
    value: "prefer",
    label: "Prefer",
    activeClass: "bg-green-600 text-white hover:bg-green-700 border-green-600",
  },
  {
    value: "works",
    label: "Works",
    activeClass: "bg-blue-500 text-white hover:bg-blue-600 border-blue-500",
  },
  {
    value: "cannot",
    label: "Can't",
    activeClass: "bg-red-500 text-white hover:bg-red-600 border-red-500",
  },
];

export function VotingSection({ reunionId }: VotingSectionProps) {
  const [dateOptions, setDateOptions] = useState<DateOptionRow[]>([]);
  const [votes, setVotes] = useState<Record<string, VoteChoice>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingVotes, setHasExistingVotes] = useState(false);

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
        const payload = expectRecord(
          await votesRes.json(),
          "household vote summary"
        );
        const data: HouseholdVotesData = {
          householdId:
            typeof payload.householdId === "string" ? payload.householdId : "",
          votes: expectArrayField<HouseholdVote>(
            payload,
            "votes",
            "household vote summary"
          ),
        };
        if (data.votes && data.votes.length > 0) {
          const voteMap: Record<string, VoteChoice> = {};
          for (const v of data.votes) {
            voteMap[v.dateOptionId] = v.vote;
          }
          setVotes(voteMap);
          setHasExistingVotes(true);
        }
      }
    } catch {
      toast.error("Failed to load voting options");
    } finally {
      setLoading(false);
    }
  }, [reunionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setVote = (dateOptionId: string, vote: VoteChoice) => {
    setVotes((prev) => {
      // Toggle off if already selected
      if (prev[dateOptionId] === vote) {
        const next = { ...prev };
        delete next[dateOptionId];
        return next;
      }
      return { ...prev, [dateOptionId]: vote };
    });
  };

  const handleSubmit = async () => {
    const voteEntries = Object.entries(votes).map(([dateOptionId, vote]) => ({
      dateOptionId,
      vote,
    }));

    if (voteEntries.length === 0) {
      toast.error("Please vote on at least one date option");
      return;
    }

    setSubmitting(true);
    try {
      await submitVotes(reunionId, voteEntries);
      toast.success("Votes submitted!");
      setHasExistingVotes(true);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit votes");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading voting options...</span>
        </CardContent>
      </Card>
    );
  }

  if (dateOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vote on Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No dates to vote on yet. The organizer will add options soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Vote on Dates
        </CardTitle>
        <CardDescription>
          {hasExistingVotes
            ? "Update your votes below. Your preferences help the organizer pick the best date."
            : "Select your availability for each date option."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dateOptions.map((opt) => {
          const currentVote = votes[opt.id];

          return (
            <div key={opt.id} className="border rounded-lg p-4">
              <div className="mb-3">
                <p className="font-medium">
                  {formatDateRange(opt.startDate, opt.endDate)}
                </p>
                {opt.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {opt.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {voteOptions.map((option) => {
                  const isActive = currentVote === option.value;
                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={isActive ? option.activeClass : ""}
                      onClick={() => setVote(opt.id, option.value)}
                    >
                      {isActive && <Check className="h-3.5 w-3.5 mr-1" />}
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <Button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(votes).length === 0}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : hasExistingVotes ? (
            "Update Votes"
          ) : (
            "Submit Votes"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
