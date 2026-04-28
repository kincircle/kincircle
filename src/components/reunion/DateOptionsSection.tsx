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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar,
  Trash2,
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  Plus,
} from "lucide-react";
import { addDateOption, deleteDateOption, sendVotingReminders } from "@/lib/actions/date";
import { expectArray, expectArrayField } from "@/lib/response";

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

export function DateOptionsSection({ reunionId }: DateOptionsSectionProps) {
  const [dateOptions, setDateOptions] = useState<DateOptionRow[]>([]);
  const [votesData, setVotesData] = useState<DateOptionWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

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

  // Find the winning option (highest prefer + works count)
  const winningId = votesData.length > 0
    ? votesData.reduce((best, opt) => {
        const bestScore = (best.votes.prefer * 2) + best.votes.works;
        const optScore = (opt.votes.prefer * 2) + opt.votes.works;
        return optScore > bestScore ? opt : best;
      }).id
    : null;

  const atLimit = dateOptions.length >= 4;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading date options...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Options
            </CardTitle>
            <CardDescription>
              Add up to 4 date options for your family to vote on
            </CardDescription>
          </div>
          {dateOptions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendReminders}
              disabled={sendingReminders}
            >
              {sendingReminders ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send Reminders
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Date Option Form */}
        {!atLimit && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <p className="text-sm font-medium">Add a date option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-description">Description (optional)</Label>
              <Input
                id="date-description"
                placeholder="e.g., Memorial Day weekend"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} disabled={adding} size="sm">
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Date Option
            </Button>
          </div>
        )}
        {atLimit && (
          <p className="text-sm text-muted-foreground">
            Maximum of 4 date options reached.
          </p>
        )}

        {/* Date Options List with Vote Tallies */}
        {dateOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No date options added yet. Add your first option above.
          </p>
        ) : (
          <div className="space-y-3">
            {dateOptions.map((opt) => {
              const tally = votesData.find((v) => v.id === opt.id);
              const votes = tally?.votes ?? { prefer: 0, works: 0, cannot: 0, total: 0 };
              const isWinning = opt.id === winningId && votes.total > 0;

              return (
                <div
                  key={opt.id}
                  className={`border rounded-lg p-4 ${
                    isWinning ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {formatDateRange(opt.startDate, opt.endDate)}
                        </p>
                        {isWinning && (
                          <Badge variant="default" className="bg-green-600">
                            Leading
                          </Badge>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {opt.description}
                        </p>
                      )}

                      {/* Vote Tallies */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 text-sm">
                          <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-700 dark:text-green-400 font-medium">
                            {votes.prefer}
                          </span>
                          <span className="text-muted-foreground">prefer</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Minus className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {votes.works}
                          </span>
                          <span className="text-muted-foreground">works</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {votes.cannot}
                          </span>
                          <span className="text-muted-foreground">can&apos;t</span>
                        </div>
                        {votes.total > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({votes.total} vote{votes.total !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>

                      {/* Simple vote bar */}
                      {votes.total > 0 && (
                        <div className="flex h-2 rounded-full overflow-hidden mt-2 max-w-xs">
                          {votes.prefer > 0 && (
                            <div
                              className="bg-green-500"
                              style={{ width: `${(votes.prefer / votes.total) * 100}%` }}
                            />
                          )}
                          {votes.works > 0 && (
                            <div
                              className="bg-blue-400"
                              style={{ width: `${(votes.works / votes.total) * 100}%` }}
                            />
                          )}
                          {votes.cannot > 0 && (
                            <div
                              className="bg-red-400"
                              style={{ width: `${(votes.cannot / votes.total) * 100}%` }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(opt.id)}
                      disabled={deleting === opt.id}
                    >
                      {deleting === opt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
