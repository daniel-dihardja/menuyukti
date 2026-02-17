"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
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
import { routes } from "@/lib/routes";
import { generateDeterministicPostCopy } from "@/lib/instagram/post-copy-generator";
import { validatePostDraftGuardrails } from "@/lib/instagram/post-draft-guardrails";

type Recommendation = {
  menuItem: string;
  action: "promote" | "reprice";
  actionReason: string;
  suggestedDaypart: string;
  confidence: "high" | "medium" | "low";
};

type WeeklySuggestion = {
  rank: number;
  menuItem: string;
  canonicalMenuNameNorm: string;
  suggestedFor: string;
  suggestedDaypart: "morning" | "lunch" | "afternoon" | "evening";
  offerType: "combo_offer" | "happy_hour" | "hero_item";
  rationale: string;
  confidence: "high" | "medium" | "low";
  sourceSignals: {
    heatmapTotalQty: number;
    heatmapDaypartQty: number;
    matrixAction: "promote" | "reprice" | "keep" | "remove" | "none";
    matrixMarginPct: number | null;
  };
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

type GuardrailDto = {
  readiness: "ready" | "degraded" | "blocked";
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  isStale: boolean;
  reasons: string[];
  actions: string[];
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

type ComposerDraft = {
  menuItem: string;
  daypart: "morning" | "lunch" | "afternoon" | "evening";
  offerType: "combo_offer" | "happy_hour" | "hero_item";
  scheduledFor: string;
  rationale: string;
  captionVariants: string[];
  selectedVariant: number;
  cta: string;
  hashtagsText: string;
};

type Props = {
  analyticsId: number;
  locationId: number;
  weekStartDate: string;
  weekEndDate: string;
  recommendations: Recommendation[];
  initialSuggestions: WeeklySuggestion[];
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  isStale: boolean;
  attributionOutcomes: Array<{
    instagramPostId: number;
    canonicalMenuNameNorm: string;
    deltaRevenue: number;
    deltaQty: number;
    confidence: "high" | "medium" | "low" | "blocked";
    reasons: string[];
  }>;
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

function normalizeComposerDaypart(value: string): ComposerDraft["daypart"] {
  if (value === "morning" || value === "lunch" || value === "afternoon" || value === "evening") {
    return value;
  }
  return "lunch";
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

function HelpLabel({
  htmlFor,
  label,
  help,
}: {
  htmlFor?: string;
  label: string;
  help: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`${label} help`} className="text-muted-foreground hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="max-w-xs">
          {help}
        </TooltipContent>
      </Tooltip>
    </Label>
  );
}

export function SchedulerClient({
  analyticsId,
  locationId,
  weekStartDate,
  weekEndDate,
  recommendations,
  initialSuggestions,
  qualityStatus,
  freshnessMinutes,
  isStale,
  attributionOutcomes,
  initialSchedule,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [scheduleId, setScheduleId] = useState<number | null>(initialSchedule?.id ?? null);
  const [scheduleStatus, setScheduleStatus] = useState<string>(initialSchedule?.status ?? "draft");
  const [suggestions, setSuggestions] = useState<WeeklySuggestion[]>(initialSuggestions);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string>("");
  const [composerDraft, setComposerDraft] = useState<ComposerDraft | null>(null);
  const [entries, setEntries] = useState<EntryDraft[]>(
    initialSchedule?.entries.map(normalizeEntry) ?? [],
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "scheduled" | "published" | "cancelled">("all");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [guardrail, setGuardrail] = useState<GuardrailDto>({
    readiness:
      qualityStatus === "failed"
        ? "blocked"
        : isStale || qualityStatus === "warn"
          ? "degraded"
          : "ready",
    qualityStatus,
    freshnessMinutes,
    isStale,
    reasons: [],
    actions: [],
  });

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

  const attributionByPostMenu = useMemo(() => {
    return new Map(
      attributionOutcomes.map((outcome) => [
        `${outcome.instagramPostId}::${outcome.canonicalMenuNameNorm}`,
        outcome,
      ]),
    );
  }, [attributionOutcomes]);

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

  const addFromSuggestion = (suggestion: WeeklySuggestion) => {
    const postCopy = generateDeterministicPostCopy({
      menuItem: suggestion.menuItem,
      offerType: suggestion.offerType,
      daypart: suggestion.suggestedDaypart,
    });
    setComposerDraft({
      menuItem: suggestion.menuItem,
      daypart: suggestion.suggestedDaypart,
      offerType: suggestion.offerType,
      scheduledFor: toLocalDateTimeInput(suggestion.suggestedFor),
      rationale: suggestion.rationale,
      captionVariants: [...postCopy.captionVariants],
      selectedVariant: 0,
      cta: postCopy.cta,
      hashtagsText: postCopy.hashtags.join(", "),
    });
  };

  const openComposerFromRecommendation = (recommendation: Recommendation) => {
    const offerType = recommendation.action === "promote" ? "combo_offer" : "happy_hour";
    const daypart = normalizeComposerDaypart(recommendation.suggestedDaypart);
    const postCopy = generateDeterministicPostCopy({
      menuItem: recommendation.menuItem,
      offerType,
      daypart,
    });
    setComposerDraft({
      menuItem: recommendation.menuItem,
      daypart,
      offerType,
      scheduledFor: addDays(weekStartDate, entries.length % 7, daypartToHour(recommendation.suggestedDaypart)),
      rationale: recommendation.actionReason,
      captionVariants: [...postCopy.captionVariants],
      selectedVariant: 0,
      cta: postCopy.cta,
      hashtagsText: postCopy.hashtags.join(", "),
    });
  };

  const applyComposerToSchedule = () => {
    if (!composerDraft) return;
    const selectedCaption =
      composerDraft.captionVariants[composerDraft.selectedVariant] ?? composerDraft.captionVariants[0] ?? "";
    const guardrail = validatePostDraftGuardrails({
      caption: selectedCaption,
      cta: composerDraft.cta,
      hashtagsRaw: composerDraft.hashtagsText,
    });
    if (guardrail.readiness === "blocked") {
      setMessage(
        `Composer blocked: ${guardrail.issues.map((issue) => issue.code).join(", ")}`,
      );
      return;
    }
    if (guardrail.readiness === "warning") {
      setMessage(`Composer warnings: ${guardrail.issues.map((issue) => issue.code).join(", ")}`);
    }
    const hashtags = composerDraft.hashtagsText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
    setEntries((prev) => [
      ...prev,
      {
        canonicalMenuName: composerDraft.menuItem,
        scheduledForLocal: composerDraft.scheduledFor,
        daypart: composerDraft.daypart,
        instagramCampaignId: "",
        instagramPostId: "",
        confidence: "medium",
        rationale: `${composerDraft.rationale} | ${selectedCaption} ${composerDraft.cta} ${hashtags}`.trim(),
        status: "draft",
      },
    ]);
    setMessage("Composer draft applied to schedule entries.");
  };

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      setSuggestionsError("");
      try {
        const response = await fetch(
          `/api/instagram/suggestions?analyticsId=${encodeURIComponent(String(analyticsId))}&weekStart=${encodeURIComponent(weekStartDate)}`,
        );
        const data = (await response.json()) as { suggestions?: WeeklySuggestion[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "FAILED_TO_LOAD_WEEKLY_SUGGESTIONS");
        }
        if (!cancelled) {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      } catch (error) {
        if (!cancelled) {
          setSuggestionsError(error instanceof Error ? error.message : "FAILED_TO_LOAD_WEEKLY_SUGGESTIONS");
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      }
    };

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [analyticsId, weekStartDate]);

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

      const data = (await response.json()) as {
        schedule?: ScheduleDto;
        guardrail?: GuardrailDto;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save schedule");
      }

      applyScheduleResponse(data.schedule);
      if (data.guardrail) setGuardrail(data.guardrail);
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
      const data = (await response.json()) as {
        schedule?: ScheduleDto;
        guardrail?: GuardrailDto;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to finalize schedule");
      }
      applyScheduleResponse(data.schedule);
      if (data.guardrail) setGuardrail(data.guardrail);
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
            <div className="space-y-1.5 min-w-0">
              <HelpLabel
                htmlFor="scheduler-week-start"
                label="Week start"
                help="Controls scheduler URL state and selects which Monday-Sunday plan you are editing."
              />
              <Input
                id="scheduler-week-start"
                type="date"
                value={weekStartDate}
                onChange={(event) => onWeekChange(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <HelpLabel
                label="Week end"
                help="Automatically derived from week start (7-day planning window)."
              />
              <Input value={weekEndDate} disabled />
            </div>
            <div className="space-y-1.5">
              <HelpLabel
                label="Schedule status"
                help="Readiness, quality, and freshness indicate whether schedules are trusted, downgraded, or blocked."
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{scheduleStatus}</Badge>
                <Badge
                  variant={
                    guardrail.readiness === "blocked"
                      ? "destructive"
                      : guardrail.readiness === "degraded"
                        ? "secondary"
                        : "default"
                  }
                >
                  readiness: {guardrail.readiness}
                </Badge>
                {guardrail.qualityStatus ? (
                  <Badge variant="outline">quality: {guardrail.qualityStatus}</Badge>
                ) : null}
                {guardrail.freshnessMinutes !== null ? (
                  <Badge variant={guardrail.isStale ? "destructive" : "secondary"}>
                    freshness: {guardrail.freshnessMinutes}m
                  </Badge>
                ) : null}
              </div>
              {guardrail.reasons.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">guardrail reasons</p>
                  <div className="flex flex-wrap gap-1">
                    {guardrail.reasons.map((reason) => (
                      <Badge key={reason} variant="outline" className="max-w-full break-all">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Heatmap Suggestions</CardTitle>
          <CardDescription>
            Data-driven weekly post ideas generated from sales heatmap demand windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading weekly suggestions...</p>
          ) : null}
          {suggestionsError ? (
            <p className="text-sm text-destructive">{suggestionsError}</p>
          ) : null}
          {!suggestionsLoading && !suggestionsError && suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weekly heatmap-based suggestions are available for this week.
            </p>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <div key={`${suggestion.rank}-${suggestion.canonicalMenuNameNorm}`} className="border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{suggestion.menuItem}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.suggestedDaypart} | {suggestion.offerType.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
                  </div>
                  <Badge variant={confidenceBadgeVariant(suggestion.confidence)}>
                    {suggestion.confidence}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    heatmap qty: {suggestion.sourceSignals.heatmapTotalQty.toFixed(0)}
                  </p>
                  <Button type="button" size="sm" onClick={() => addFromSuggestion(suggestion)}>
                    Use Suggestion
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {composerDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>Post Composer</CardTitle>
            <CardDescription>
              Prefilled copy from weekly suggestions. Edit before applying to schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Menu</Label>
                <Input
                  value={composerDraft.menuItem}
                  onChange={(event) =>
                    setComposerDraft((prev) => (prev ? { ...prev, menuItem: event.target.value } : prev))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Daypart</Label>
                <Select
                  value={composerDraft.daypart}
                  onValueChange={(value) =>
                    setComposerDraft((prev) =>
                      prev ? { ...prev, daypart: value as ComposerDraft["daypart"] } : prev,
                    )
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
              </div>
              <div className="space-y-1.5">
                <Label>Scheduled for</Label>
                <Input
                  type="datetime-local"
                  value={composerDraft.scheduledFor}
                  onChange={(event) =>
                    setComposerDraft((prev) => (prev ? { ...prev, scheduledFor: event.target.value } : prev))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Caption variant</Label>
              <Select
                value={String(composerDraft.selectedVariant)}
                onValueChange={(value) =>
                  setComposerDraft((prev) =>
                    prev ? { ...prev, selectedVariant: Number(value) || 0 } : prev,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {composerDraft.captionVariants.map((caption, idx) => (
                    <SelectItem key={`${idx}-${caption.slice(0, 10)}`} value={String(idx)}>
                      Variant {idx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {composerDraft.captionVariants[composerDraft.selectedVariant] ?? ""}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CTA</Label>
                <Input
                  value={composerDraft.cta}
                  onChange={(event) =>
                    setComposerDraft((prev) => (prev ? { ...prev, cta: event.target.value } : prev))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hashtags (comma separated)</Label>
                <Input
                  value={composerDraft.hashtagsText}
                  onChange={(event) =>
                    setComposerDraft((prev) =>
                      prev ? { ...prev, hashtagsText: event.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={applyComposerToSchedule}>
                Apply To Schedule
              </Button>
              <Button type="button" variant="outline" onClick={() => setComposerDraft(null)}>
                Close Composer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
                  className="border p-3 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{recommendation.menuItem}</p>
                    <p className="text-xs text-muted-foreground">
                      {recommendation.action} | daypart: {recommendation.suggestedDaypart}
                    </p>
                    <p className="text-xs text-muted-foreground">{recommendation.actionReason}</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => openComposerFromRecommendation(recommendation)}>
                    Generate Post
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
              <HelpLabel
                htmlFor="scheduler-search"
                label="Filter by menu"
                help="Find entries by menu item name to speed up edits in larger weekly plans."
              />
              <Input
                id="scheduler-search"
                placeholder="Search menu item"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <HelpLabel
                htmlFor="scheduler-status-filter"
                label="Filter by status"
                help="Narrow the table to draft, scheduled, published, or cancelled entries."
              />
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
              <HelpLabel
                label="Rows"
                help="Count of currently visible entries after menu and status filters are applied."
              />
              <Input value={String(filteredEntries.length)} disabled />
            </div>
          </div>

          <div className="overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Menu
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Menu help" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6} className="max-w-xs">
                          Canonical menu item targeted by this post slot.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Daypart</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Campaign ID
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Campaign ID help" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6} className="max-w-xs">
                          Optional link to an Instagram campaign identity for attribution and governance.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Post ID
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Post ID help" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6} className="max-w-xs">
                          Optional link to a specific Instagram post identity when already known.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attribution</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Rationale
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Rationale help" className="text-muted-foreground hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6} className="max-w-xs">
                          Short reason captured at scheduling time to preserve explainability.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
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
                        {entry.instagramPostId.trim() ? (
                          (() => {
                            const lookupKey = `${Number(entry.instagramPostId)}::${entry.canonicalMenuName
                              .trim()
                              .toLowerCase()}`;
                            const outcome = attributionByPostMenu.get(lookupKey);
                            if (!outcome) {
                              return <span className="text-xs text-muted-foreground">No observed outcome yet</span>;
                            }
                            return (
                              <div className="space-y-1">
                                <Badge variant={confidenceBadgeVariant(outcome.confidence)}>
                                  {outcome.confidence}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  Δ qty {outcome.deltaQty.toFixed(1)} | Δ rev {outcome.deltaRevenue.toFixed(2)}
                                </p>
                                {outcome.reasons.length > 0 ? (
                                  <p className="max-w-48 text-xs text-muted-foreground">
                                    {outcome.reasons.join(", ")}
                                  </p>
                                ) : null}
                                <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2">
                                  <Link
                                    href={`${routes.analytics.attribution(analyticsId)}?postId=${encodeURIComponent(
                                      entry.instagramPostId,
                                    )}&menu=${encodeURIComponent(entry.canonicalMenuName)}`}
                                  >
                                    View attribution
                                  </Link>
                                </Button>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-muted-foreground">Link post id to view attribution</span>
                        )}
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
