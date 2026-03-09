"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@workspace/ui/components/ai-elements/artifact";
import { CalendarIcon, GlobeIcon } from "lucide-react";

export type PlanningArtifact = {
  dateStart: string;
  dateEnd: string;
  relevantEvents?: string | null;
};

type AiArtifactPanelProps = {
  planning?: PlanningArtifact;
};

type EventItem = {
  title: string;
  scope: string;
  snippet: string;
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

function parseEvents(raw: string): EventItem[] {
  return raw
    .split("\n")
    .map((line) => {
      const parts = line.split("|");
      if (parts.length < 2) return null;
      return {
        title: parts[0]?.trim() ?? "",
        scope: parts[1]?.trim() ?? "",
        snippet: parts.slice(2).join("|").trim(),
      };
    })
    .filter((e): e is EventItem => e !== null && e.title.length > 0);
}

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

  const events =
    planning.relevantEvents ? parseEvents(planning.relevantEvents) : null;
  const eventsReady = planning.relevantEvents !== undefined;

  return (
    <Artifact className="size-full">
      <ArtifactHeader>
        <ArtifactTitle>Campaign Plan</ArtifactTitle>
        <ArtifactDescription>Scheduled campaign dates</ArtifactDescription>
      </ArtifactHeader>
      <ArtifactContent>
        <div className="space-y-4">
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

          {/* Relevant Events */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <GlobeIcon className="size-3.5" />
              Relevant Events
            </div>

            {!eventsReady ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-2.5 w-full animate-pulse rounded bg-muted-foreground/10" />
                    {i < 3 && <div className="border-t pt-1" />}
                  </div>
                ))}
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event, idx) => (
                  <div key={idx}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {event.title}
                      </p>
                      <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {event.scope}
                      </span>
                    </div>
                    {event.snippet && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {event.snippet}
                      </p>
                    )}
                    {idx < events.length - 1 && <div className="mt-3 border-t" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No relevant events found for this period.
              </p>
            )}
          </div>
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
