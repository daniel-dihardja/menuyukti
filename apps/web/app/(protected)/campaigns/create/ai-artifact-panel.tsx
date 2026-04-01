"use client";

import { useState } from "react";
import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@workspace/ui/components/ai-elements/artifact";
import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import { Button } from "@workspace/ui/components/button";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  CalendarIcon,
  DatabaseIcon,
  GalleryHorizontalIcon,
  GlobeIcon,
  LayoutListIcon,
  MapPinIcon,
  SparklesIcon,
} from "lucide-react";

export type NationalHoliday = {
  id: string;
  localName: string;
  name: string;
  date: string;
  type?: string;
};

export type PostSlot = {
  scheduled_date: string;
  scheduled_time?: string;
  theme: "holiday" | "promotion" | "engagement";
  format: "single" | "carousel";
  focus_item: string | null;
  carousel_items: string[] | null;
  carousel_narrative: string | null;
  caption_seed: string;
};

export type CampaignBrief = {
  campaign_theme: string;
  tone: string;
  target_audience: string;
  posting_cadence: string;
  post_slots: PostSlot[];
};

export type PlanningArtifact = {
  dateStart: string;
  dateEnd: string;
  nationalHolidays?: NationalHoliday[] | null;
  locationSummary?: string | null;
  campaignBrief?: CampaignBrief | null;
};

type AnalyticsRun = { id: string; name: string; filename: string };

type AiArtifactPanelProps = {
  planning?: PlanningArtifact;
  campaignDates: { dateStart: string; dateEnd: string };
  onDatesChange: (dates: { dateStart: string; dateEnd: string }) => void;
  onCreateCampaign?: () => void;
  onCreateLocationProfile?: () => void;
  analyticsRuns?: AnalyticsRun[];
  selectedAnalyticsId?: number | null;
  onAnalyticsIdChange?: (id: number | null) => void;
  isStreaming?: boolean;
  isLoadingHolidays?: boolean;
  onLocationFeedback?: (feedback: string) => void;
};

function selectedReportLabel(
  analyticsRuns: AnalyticsRun[] | undefined,
  selectedAnalyticsId: number | null | undefined
): string {
  if (selectedAnalyticsId === null || selectedAnalyticsId === undefined || !analyticsRuns?.length) {
    return "No report selected";
  }
  const run = analyticsRuns.find((r) => r.id === String(selectedAnalyticsId));
  if (!run) return "No report selected";
  return run.name || run.filename;
}

type HolidayItem = {
  localName: string;
  englishName: string;
  date?: string;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** e.g. Fri, 03.04. — weekday plus day.month with dots */
function formatPostScheduleDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const wd = date.toLocaleDateString("en-US", { weekday: "short" });
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${wd}, ${dd}.${mm}.`;
}

function slotPromotedItemsLine(slot: PostSlot): string {
  const fmt = (slot.format ?? "single").toLowerCase();
  if (fmt === "carousel" && slot.carousel_items && slot.carousel_items.length > 0) {
    return slot.carousel_items.join(" · ");
  }
  if (slot.focus_item) return slot.focus_item;
  return "—";
}

const THEME_STYLES: Record<PostSlot["theme"], string> = {
  holiday: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  promotion: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  engagement: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function AiArtifactPanel({
  planning,
  campaignDates,
  onDatesChange,
  onCreateCampaign,
  onCreateLocationProfile,
  analyticsRuns,
  selectedAnalyticsId,
  onAnalyticsIdChange,
  isStreaming,
  isLoadingHolidays,
  onLocationFeedback,
}: AiArtifactPanelProps) {
  const holidays = planning?.nationalHolidays
    ? planning.nationalHolidays.map((h) => ({
        localName: h.localName,
        englishName: h.name,
        date: h.date || undefined,
      }))
    : null;

  const hasSalesReportSelected =
    selectedAnalyticsId !== null && selectedAnalyticsId !== undefined;

  const [locationFeedback, setLocationFeedback] = useState("");

  return (
    <Artifact className="size-full">
      <ArtifactHeader>
        <ArtifactTitle>Campaign Plan</ArtifactTitle>
        <ArtifactDescription>Sales data, dates, and schedule</ArtifactDescription>
      </ArtifactHeader>
      <ArtifactContent>
        <div className="space-y-4">
          {/* Section 1: Campaign Dates */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              Campaign Dates
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Start date
                </p>
                <div className="w-52">
                  <DatePicker
                    value={campaignDates.dateStart}
                    onChange={(date) =>
                      onDatesChange({ ...campaignDates, dateStart: date })
                    }
                    disabled={isStreaming}
                  />
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">
                  End date
                </p>
                <div className="w-52">
                  <DatePicker
                    value={campaignDates.dateEnd}
                    onChange={(date) =>
                      onDatesChange({ ...campaignDates, dateEnd: date })
                    }
                    disabled={isStreaming}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: National Holidays */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <GlobeIcon className="size-3.5" />
              National Holidays
            </div>

            {isLoadingHolidays ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-2.5 w-full animate-pulse rounded bg-muted-foreground/10" />
                    {i < 3 && <div className="border-t pt-1" />}
                  </div>
                ))}
              </div>
            ) : holidays && holidays.length > 0 ? (
              <div className="space-y-3">
                {holidays.map((holiday, idx) => (
                  <div key={idx}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {holiday.localName}
                        </p>
                        {holiday.englishName && holiday.englishName !== holiday.localName && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {holiday.englishName}
                          </p>
                        )}
                      </div>
                      {holiday.date && (
                        <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          <CalendarIcon className="size-3" />
                          {holiday.date}
                        </span>
                      )}
                    </div>
                    {idx < holidays.length - 1 && <div className="mt-3 border-t" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No national holidays found for this period.
              </p>
            )}
          </div>

          {/* Section 3: Analytics Run */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <DatabaseIcon className="size-3.5" />
              Analytics Run
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Sales report
              </p>
              <Select
                value={
                  selectedAnalyticsId !== null && selectedAnalyticsId !== undefined
                    ? String(selectedAnalyticsId)
                    : undefined
                }
                onValueChange={(val) => onAnalyticsIdChange?.(Number(val))}
                disabled={isStreaming}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a sales data source…" />
                </SelectTrigger>
                <SelectContent>
                  {analyticsRuns && analyticsRuns.length > 0 ? (
                    analyticsRuns.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.name || run.filename}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      No sales data available for this location.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Create Location Profile Button */}
          {!planning?.locationSummary && !planning?.campaignBrief && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <Button
                className="w-full"
                onClick={onCreateLocationProfile}
                disabled={isStreaming || !hasSalesReportSelected}
                title={
                  !hasSalesReportSelected
                    ? "Select an analytics run first"
                    : undefined
                }
              >
                <MapPinIcon className="size-4" />
                Create location profile
              </Button>
              {!hasSalesReportSelected && !isStreaming && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  Select an analytics run above to enable this step.
                </p>
              )}
            </div>
          )}

          {/* Location profile — populated during campaign flow (check/create profile steps); planning SSE */}
          {planning?.locationSummary && planning.locationSummary.trim().length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MapPinIcon className="size-3.5" />
                Location profile
              </div>
              <MessageResponse className="text-sm leading-relaxed text-foreground">
                {planning.locationSummary.trim()}
              </MessageResponse>
              <div className="mt-4 border-t pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Have feedback on this profile? Describe any corrections or additions and the AI will update it.
                </p>
                <Textarea
                  placeholder="e.g. The restaurant focuses on vegan cuisine, not general Italian…"
                  value={locationFeedback}
                  onChange={(e) => setLocationFeedback(e.target.value)}
                  disabled={isStreaming}
                  className="resize-none text-sm"
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isStreaming || !locationFeedback.trim()}
                  onClick={() => {
                    if (!locationFeedback.trim()) return;
                    onLocationFeedback?.(locationFeedback.trim());
                    setLocationFeedback("");
                  }}
                >
                  Send Feedback
                </Button>
              </div>
            </div>
          )}

          {/* Campaign Brief */}
          {planning?.campaignBrief !== null && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SparklesIcon className="size-3.5" />
                Campaign Brief
              </div>
              {planning?.campaignBrief === undefined ? (
                <div className="space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted-foreground/20" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/10" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Theme</p>
                    <p className="text-right text-sm font-medium text-foreground">
                      {planning?.campaignBrief?.campaign_theme}
                    </p>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Tone</p>
                    <p className="text-right text-sm text-foreground">
                      {planning?.campaignBrief?.tone}
                    </p>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Audience</p>
                    <p className="text-right text-sm text-foreground">
                      {planning?.campaignBrief?.target_audience}
                    </p>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Cadence</p>
                    <p className="text-right text-sm text-foreground">
                      {planning?.campaignBrief?.posting_cadence}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post Schedule */}
          {planning?.campaignBrief && planning.campaignBrief.post_slots.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <LayoutListIcon className="size-3.5" />
                  Post Schedule
                </div>
                <div className="flex items-center gap-1.5">
                  {planning?.campaignBrief?.post_slots.some(
                    (s) => (s.format ?? "single").toLowerCase() === "carousel"
                  ) && (
                    <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                      <GalleryHorizontalIcon className="size-3" />
                      {
                        planning?.campaignBrief?.post_slots.filter(
                          (s) => (s.format ?? "single").toLowerCase() === "carousel"
                        ).length
                      }{" "}
                      carousel
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {planning?.campaignBrief?.post_slots.length} posts
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {planning?.campaignBrief?.post_slots.map((slot, idx) => {
                  const isCarousel =
                    (slot.format ?? "single").toLowerCase() === "carousel";
                  return (
                  <div key={idx}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex w-[5.5rem] shrink-0 flex-col">
                        <span className="text-xs font-semibold leading-tight text-foreground">
                          {formatPostScheduleDateLabel(slot.scheduled_date)}
                        </span>
                        {slot.scheduled_time && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {slot.scheduled_time}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {slotPromotedItemsLine(slot)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${THEME_STYLES[slot.theme]}`}
                          >
                            {slot.theme}
                          </span>
                          {isCarousel ? (
                            <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                              <GalleryHorizontalIcon className="size-3" />
                              Carousel
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Single
                            </span>
                          )}
                        </div>
                        {isCarousel && slot.carousel_narrative && (
                          <p className="mt-1.5 text-xs italic text-muted-foreground">
                            {slot.carousel_narrative}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          <span className="mr-1 font-medium text-muted-foreground/60">Caption seed:</span>
                          {slot.caption_seed}
                        </p>
                      </div>
                    </div>
                    {idx < (planning?.campaignBrief?.post_slots.length ?? 0) - 1 && (
                      <div className="mt-3 border-t" />
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
