"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@workspace/ui/components/ai-elements/artifact";
import { CalendarIcon } from "lucide-react";

export type PlanningArtifact = {
  dateStart: string;
  dateEnd: string;
};

type AiArtifactPanelProps = {
  planning?: PlanningArtifact;
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

  return (
    <Artifact className="size-full">
      <ArtifactHeader>
        <ArtifactTitle>Campaign Plan</ArtifactTitle>
        <ArtifactDescription>Scheduled campaign dates</ArtifactDescription>
      </ArtifactHeader>
      <ArtifactContent>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              Start Date
            </div>
            <p className="text-sm font-medium text-foreground">
              {formatDate(planning.dateStart)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {planning.dateStart}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              End Date
            </div>
            <p className="text-sm font-medium text-foreground">
              {formatDate(planning.dateEnd)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {planning.dateEnd}
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Campaign Duration
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
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
      </ArtifactContent>
    </Artifact>
  );
}
