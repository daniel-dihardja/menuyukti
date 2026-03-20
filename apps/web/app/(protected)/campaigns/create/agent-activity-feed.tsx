"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@workspace/ui/components/ai-elements/chain-of-thought";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";

export type ActivityStep = {
  step: string;
  status: "running" | "done" | "reflecting" | "reflect_pass" | "reflect_revise";
  label: string;
  detail?: string;
};

type AgentActivityFeedProps = {
  steps: ActivityStep[];
  hasText: boolean;
  isStreaming: boolean;
};

export function AgentActivityFeed({
  steps,
  hasText,
  isStreaming,
}: AgentActivityFeedProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  useEffect(() => {
    if (hasText && !hasAutoCollapsed) {
      setIsOpen(false);
      setHasAutoCollapsed(true);
    }
  }, [hasText, hasAutoCollapsed]);

  // Reset collapse state when a new stream starts
  useEffect(() => {
    if (isStreaming && steps.length === 0) {
      setIsOpen(true);
      setHasAutoCollapsed(false);
    }
  }, [isStreaming, steps.length]);

  // Transient "writing/thinking" indicators — hide them once streaming ends
  const TRANSIENT_STEPS = new Set(["respond_with_plan", "handle_unknown"]);
  const visibleSteps = isStreaming
    ? steps
    : steps.filter((s) => !TRANSIENT_STEPS.has(s.step));

  if (visibleSteps.length === 0) return null;

  const doneCount = visibleSteps.filter((s) => s.status === "done").length;
  const hasRunning = visibleSteps.some((s) => s.status === "running");

  const headerLabel = hasRunning
    ? steps.find((s) => s.status === "running")?.label ?? "Working..."
    : `${doneCount} step${doneCount !== 1 ? "s" : ""} completed`;

  return (
    <div className="mb-3">
      <ChainOfThought open={isOpen} onOpenChange={setIsOpen}>
        <ChainOfThoughtHeader>{headerLabel}</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          {visibleSteps.map((step) => (
            <div
              key={step.step}
              className={cn(
                "flex items-start gap-2 text-sm fade-in-0 slide-in-from-top-2 animate-in",
                step.status === "done"
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {step.status !== "done" ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <CheckIcon className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span>{step.label}</span>
                {step.detail && (
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground/70">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  );
}
