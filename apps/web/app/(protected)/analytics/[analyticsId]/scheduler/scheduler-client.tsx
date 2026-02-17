"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type Recommendation = {
  menuItem: string;
  action: "promote" | "reprice";
  actionReason: string;
  suggestedDaypart: string;
  confidence: "high" | "medium" | "low";
};

type EntryDto = {
  id: number;
  instagramCampaignId: number | null;
  instagramPostId: number | null;
  canonicalMenuName: string;
  canonicalMenuNameNorm: string;
  scheduledFor: string;
  daypart: string | null;
  confidence: string;
  rationale: string | null;
  status: string;
};

type ScheduleDto = {
  id: number;
  status: string;
  source: string;
  entries: EntryDto[];
};

type EntryDraft = {
  id?: number;
  canonicalMenuName: string;
  scheduledForLocal: string;
  daypart: string;
  instagramCampaignId: string;
  instagramPostId: string;
  confidence: "high" | "medium" | "low" | "blocked";
  rationale: string;
  status: "draft" | "scheduled" | "published" | "cancelled";
};

type Props = {
  analyticsId: number;
  locationId: number;
  weekStartDate: string;
  weekEndDate: string;
  recommendations: Recommendation[];
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  isStale: boolean;
  initialSchedule: ScheduleDto | null;
};

function toLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(localDateTime: string): string | null {
  if (!localDateTime) return null;
  const parsed = new Date(localDateTime);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function daypartToHour(daypart: string): number {
  if (daypart === "morning") return 9;
  if (daypart === "lunch") return 12;
  if (daypart === "afternoon") return 16;
  return 19;
}

function addDays(baseYmd: string, days: number, hour: number): string {
  const base = new Date(`${baseYmd}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  base.setUTCHours(hour, 0, 0, 0);
  return toLocalDateTimeInput(base.toISOString());
}

function normalizeEntry(entry: EntryDto): EntryDraft {
  const confidence =
    entry.confidence === "high" ||
    entry.confidence === "medium" ||
    entry.confidence === "low" ||
    entry.confidence === "blocked"
      ? entry.confidence
      : "medium";
  const status =
    entry.status === "scheduled" ||
    entry.status === "published" ||
    entry.status === "cancelled"
      ? entry.status
      : "draft";

  return {
    id: entry.id,
    canonicalMenuName: entry.canonicalMenuName,
    scheduledForLocal: toLocalDateTimeInput(entry.scheduledFor),
    daypart: entry.daypart ?? "lunch",
    instagramCampaignId: entry.instagramCampaignId == null ? "" : String(entry.instagramCampaignId),
    instagramPostId: entry.instagramPostId == null ? "" : String(entry.instagramPostId),
    confidence,
    rationale: entry.rationale ?? "",
    status,
  };
}

function confidenceBadgeVariant(confidence: string): "default" | "secondary" | "destructive" {
  if (confidence === "high") return "default";
  if (confidence === "blocked") return "destructive";
  return "secondary";
}

export function SchedulerClient({
  analyticsId,
  locationId,
  weekStartDate,
  weekEndDate,
  recommendations,
  qualityStatus,
  freshnessMinutes,
  isStale,
  initialSchedule,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [scheduleId, setScheduleId] = useState<number | null>(initialSchedule?.id ?? null);
  const [scheduleStatus, setScheduleStatus] = useState<string>(initialSchedule?.status ?? "draft");
  const [entries, setEntries] = useState<EntryDraft[]>(
    initialSchedule?.entries.map(normalizeEntry) ?? [],
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "scheduled" | "published" | "cancelled">("all");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const applyScheduleResponse = (schedule: ScheduleDto | null | undefined) => {
    if (!schedule) return;
    setScheduleId(schedule.id);
    setScheduleStatus(schedule.status);
    setEntries(schedule.entries.map(normalizeEntry));
  };

  const payloadEntries = useMemo(
    () =>
      entries
        .map((entry) => {
          const scheduledFor = toIsoOrNull(entry.scheduledForLocal);
          if (!entry.canonicalMenuName.trim() || !scheduledFor) return null;
          return {
            id: entry.id,
            canonicalMenuName: entry.canonicalMenuName.trim(),
            scheduledFor,
            daypart: entry.daypart,
            instagramCampaignId: entry.instagramCampaignId.trim()
              ? Number(entry.instagramCampaignId.trim())
              : null,
            instagramPostId: entry.instagramPostId.trim()
              ? Number(entry.instagramPostId.trim())
              : null,
            confidence: entry.confidence,
            rationale: entry.rationale.trim() || null,
            status: entry.status,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const byQuery = !query.trim() || entry.canonicalMenuName.toLowerCase().includes(query.trim().toLowerCase());
      const byStatus = statusFilter === "all" || entry.status === statusFilter;
      return byQuery && byStatus;
    });
  }, [entries, query, statusFilter]);

  const setEntry = (index: number, updater: (entry: EntryDraft) => EntryDraft) => {
    setEntries((prev) => prev.map((entry, i) => (i === index ? updater(entry) : entry)));
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlankEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        canonicalMenuName: "",
        scheduledForLocal: addDays(weekStartDate, prev.length % 7, 12),
        daypart: "lunch",
        instagramCampaignId: "",
        instagramPostId: "",
        confidence: "medium",
        rationale: "",
        status: "draft",
      },
    ]);
  };

  const addFromRecommendation = (recommendation: Recommendation) => {
    setEntries((prev) => [
      ...prev,
      {
        canonicalMenuName: recommendation.menuItem,
        scheduledForLocal: addDays(
          weekStartDate,
          prev.length % 7,
          daypartToHour(recommendation.suggestedDaypart),
        ),
        daypart: recommendation.suggestedDaypart,
        instagramCampaignId: "",
        instagramPostId: "",
        confidence: recommendation.confidence,
        rationale: recommendation.actionReason,
        status: "draft",
      },
    ]);
  };

  const saveDraft = async (): Promise<ScheduleDto | null> => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/instagram/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          weekStartDate,
          weekEndDate,
          status: scheduleStatus === "finalized" ? "scheduled" : scheduleStatus,
          source: "scheduler_ui",
          replaceEntries: true,
          entries: payloadEntries,
        }),
      });

      const data = (await response.json()) as { schedule?: ScheduleDto; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save schedule");
      }

      applyScheduleResponse(data.schedule);
      setMessage("Schedule saved.");
      return data.schedule ?? null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save schedule");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const finalizeSchedule = async () => {
    setSaving(true);
    setMessage("");
    try {
      let id = scheduleId;
      if (!id) {
        const saved = await saveDraft();
        id = saved?.id ?? null;
      }
      if (!id) throw new Error("Save schedule before finalizing");

      const response = await fetch("/api/instagram/schedules?action=finalize", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: id,
          locationId,
          replaceEntries: true,
          entries: payloadEntries,
        }),
      });
      const data = (await response.json()) as { schedule?: ScheduleDto; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to finalize schedule");
      }
      applyScheduleResponse(data.schedule);
      setMessage("Schedule finalized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to finalize schedule");
    } finally {
      setSaving(false);
    }
  };

  const onWeekChange = (nextWeekStart: string) => {
    const search = nextWeekStart ? `?weekStart=${encodeURIComponent(nextWeekStart)}` : "";
    router.push(`${pathname}${search}`);
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Week Context</CardTitle>
          <CardDescription>
            Analytics #{analyticsId} for location {locationId}. Choose the target week from URL state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduler-week-start">Week start</Label>
              <Input
                id="scheduler-week-start"
                type="date"
                value={weekStartDate}
                onChange={(event) => onWeekChange(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Week end</Label>
              <Input value={weekEndDate} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Schedule status</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{scheduleStatus}</Badge>
                {qualityStatus ? <Badge variant="outline">quality: {qualityStatus}</Badge> : null}
                {freshnessMinutes !== null ? (
                  <Badge variant={isStale ? "destructive" : "secondary"}>
                    freshness: {freshnessMinutes}m
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation Candidates</CardTitle>
          <CardDescription>
            Add deterministic matrix recommendations directly into this week schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => recommendations.forEach((recommendation) => addFromRecommendation(recommendation))}
            >
              Add All Recommendations
            </Button>
            <Button type="button" variant="outline" onClick={addBlankEntry}>
              Add Blank Entry
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendation candidates are currently available.</p>
            ) : (
              recommendations.map((recommendation) => (
                <div
                  key={`${recommendation.menuItem}-${recommendation.action}`}
                  className="border rounded-md p-3 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{recommendation.menuItem}</p>
                    <p className="text-xs text-muted-foreground">
                      {recommendation.action} | daypart: {recommendation.suggestedDaypart}
                    </p>
                    <p className="text-xs text-muted-foreground">{recommendation.actionReason}</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => addFromRecommendation(recommendation)}>
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Entries</CardTitle>
          <CardDescription>
            Edit posting slot, campaign/post linkage, confidence, and status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduler-search">Filter by menu</Label>
              <Input
                id="scheduler-search"
                placeholder="Search menu item"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduler-status-filter">Filter by status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger id="scheduler-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rows</Label>
              <Input value={String(filteredEntries.length)} disabled />
            </div>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu</TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Daypart</TableHead>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Post ID</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rationale</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const index = entries.indexOf(entry);
                  return (
                    <TableRow key={`${entry.id ?? "new"}-${index}`}>
                      <TableCell>
                        <Input
                          value={entry.canonicalMenuName}
                          onChange={(event) =>
                            setEntry(index, (current) => ({ ...current, canonicalMenuName: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="datetime-local"
                          value={entry.scheduledForLocal}
                          onChange={(event) =>
                            setEntry(index, (current) => ({ ...current, scheduledForLocal: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.daypart}
                          onValueChange={(value) =>
                            setEntry(index, (current) => ({ ...current, daypart: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="afternoon">Afternoon</SelectItem>
                            <SelectItem value="evening">Evening</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          value={entry.instagramCampaignId}
                          onChange={(event) =>
                            setEntry(index, (current) => ({ ...current, instagramCampaignId: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          value={entry.instagramPostId}
                          onChange={(event) =>
                            setEntry(index, (current) => ({ ...current, instagramPostId: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.confidence}
                          onValueChange={(value) =>
                            setEntry(index, (current) => ({
                              ...current,
                              confidence: value as EntryDraft["confidence"],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.status}
                          onValueChange={(value) =>
                            setEntry(index, (current) => ({
                              ...current,
                              status: value as EntryDraft["status"],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.rationale}
                          onChange={(event) =>
                            setEntry(index, (current) => ({ ...current, rationale: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" onClick={() => removeEntry(index)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={confidenceBadgeVariant("high")}>High trust</Badge>
              <Badge variant={confidenceBadgeVariant("medium")}>Medium trust</Badge>
              <Badge variant={confidenceBadgeVariant("blocked")}>Blocked</Badge>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={saveDraft} disabled={saving}>
                Save Draft
              </Button>
              <Button type="button" onClick={finalizeSchedule} disabled={saving}>
                Finalize Week
              </Button>
            </div>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}
