"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@workspace/ui/components/ai-elements/artifact";
import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import { CalendarIcon, GalleryHorizontalIcon, GlobeIcon, LayoutListIcon, SparklesIcon, StoreIcon } from "lucide-react";

export type NationalHoliday = {
  localName: string;
  name: string;
  date: string;
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

type AiArtifactPanelProps = {
  planning?: PlanningArtifact;
};

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

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const THEME_STYLES: Record<PostSlot["theme"], string> = {
  holiday: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  promotion: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  engagement: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function AiArtifactPanel({ planning }: AiArtifactPanelProps) {
  if (!planning) {
    return (
      <div className="flex size-full items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <CalendarIcon className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No plan generated yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Ask me to create an Instagram campaign to see the plan here
          </p>
        </div>
      </div>
    );
  }

  const holidays = planning.nationalHolidays
    ? planning.nationalHolidays.map((h) => ({
        localName: h.localName,
        englishName: h.name,
        date: h.date || undefined,
      }))
    : null;
  const holidaysReady = planning.nationalHolidays !== undefined;

  return (
    <Artifact className="size-full">
      <ArtifactHeader>
        <ArtifactTitle>Campaign Plan</ArtifactTitle>
        <ArtifactDescription>Scheduled campaign dates</ArtifactDescription>
      </ArtifactHeader>
      <ArtifactContent>
        <div className="space-y-4">
          {/* Location Profile */}
          {planning.locationSummary !== null && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <StoreIcon className="size-3.5" />
                Location Profile
              </div>
              {planning.locationSummary === undefined ? (
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-muted-foreground/20" />
                  <div className="h-3 w-4/6 animate-pulse rounded bg-muted-foreground/10" />
                </div>
              ) : (
                <MessageResponse className="text-sm leading-relaxed text-foreground">
                  {planning.locationSummary}
                </MessageResponse>
              )}
            </div>
          )}

          {/* Campaign Period */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              Campaign Period
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Start Date
                </p>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(planning.dateStart)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {planning.dateStart}
                  </p>
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">
                  End Date
                </p>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(planning.dateEnd)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {planning.dateEnd}
                  </p>
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Duration
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {(() => {
                    const start = new Date(planning.dateStart + "T00:00:00");
                    const end = new Date(planning.dateEnd + "T00:00:00");
                    const days =
                      Math.round(
                        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                      ) + 1;
                    return `${days} day${days !== 1 ? "s" : ""}`;
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* National Holidays */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <GlobeIcon className="size-3.5" />
              National Holidays
            </div>

            {!holidaysReady ? (
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

          {/* Campaign Brief */}
          {planning.campaignBrief !== null && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SparklesIcon className="size-3.5" />
                Campaign Brief
              </div>
              {planning.campaignBrief === undefined ? (
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
                      {planning.campaignBrief.campaign_theme}
                    </p>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Tone</p>
                    <p className="text-right text-sm text-foreground">
                      {planning.campaignBrief.tone}
                    </p>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Audience</p>
                    <p className="text-right text-sm text-foreground">
                      {planning.campaignBrief.target_audience}
                    </p>
                  </div>
                  <div className="border-t" />
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">Cadence</p>
                    <p className="text-right text-sm text-foreground">
                      {planning.campaignBrief.posting_cadence}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post Schedule */}
          {planning.campaignBrief && planning.campaignBrief.post_slots.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <LayoutListIcon className="size-3.5" />
                  Post Schedule
                </div>
                <div className="flex items-center gap-1.5">
                  {planning.campaignBrief.post_slots.some((s) => s.format === "carousel") && (
                    <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                      <GalleryHorizontalIcon className="size-3" />
                      {planning.campaignBrief.post_slots.filter((s) => s.format === "carousel").length} carousel
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {planning.campaignBrief.post_slots.length} posts
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {planning.campaignBrief.post_slots.map((slot, idx) => (
                  <div key={idx}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex w-14 shrink-0 flex-col items-center">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {formatShortDate(slot.scheduled_date)}
                        </span>
                        {slot.scheduled_time && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {slot.scheduled_time}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${THEME_STYLES[slot.theme]}`}
                          >
                            {slot.theme}
                          </span>
                          {slot.format === "carousel" ? (
                            <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                              <GalleryHorizontalIcon className="size-3" />
                              Carousel
                            </span>
                          ) : (
                            slot.focus_item && (
                              <span className="truncate text-xs text-muted-foreground">
                                {slot.focus_item}
                              </span>
                            )
                          )}
                        </div>
                        {slot.format === "carousel" && slot.carousel_items && slot.carousel_items.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {slot.carousel_items.map((item, i) => (
                              <span
                                key={i}
                                className="rounded-md border bg-background px-1.5 py-0.5 text-xs font-medium text-foreground"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                        {slot.format === "carousel" && slot.carousel_narrative && (
                          <p className="mb-1.5 text-xs italic text-muted-foreground">
                            {slot.carousel_narrative}
                          </p>
                        )}
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <span className="mr-1 font-medium text-muted-foreground/60">Caption seed:</span>
                          {slot.caption_seed}
                        </p>
                      </div>
                    </div>
                    {idx < planning.campaignBrief!.post_slots.length - 1 && (
                      <div className="mt-3 border-t" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
