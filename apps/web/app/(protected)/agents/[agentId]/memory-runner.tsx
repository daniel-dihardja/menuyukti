"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import type { DecisionApiContractDto } from "@/lib/contracts/decision-api-contract";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";
import { resolveSelectedContextState } from "./selected-context";
import { OutputTrustPanel } from "./output-trust-panel";
import { AgentRunHistoryPanel } from "./agent-run-history-panel";
import { AgentRunComparisonPanel } from "./agent-run-comparison-panel";
import type { SessionRunSnapshot } from "./run-comparison";

type MemoryEvent = {
  id: string;
  version: number;
  recommendationId: string;
  sourceAgentId: string;
  state: "accepted" | "rejected";
  rationale: string | null;
  createdAt: string;
};

type MemoryPayload = {
  contract?: DecisionApiContractDto;
  count: number;
  events: MemoryEvent[];
  memoryContext?: {
    memory_context?: {
      continuity_signal?: string;
      accepted_count?: number;
      rejected_count?: number;
    };
  };
};

export function MemoryRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<MemoryPayload | null>(null);
  const [historyToken, setHistoryToken] = useState(0);
  const [sessionRuns, setSessionRuns] = useState<SessionRunSnapshot[]>([]);

  const events = useMemo(() => payload?.events ?? [], [payload]);
  const contextState = resolveSelectedContextState({ locationId, analyticsId });

  function appendSessionRun(next: MemoryPayload, action: "refresh" | "accepted" | "rejected") {
    const status = action === "refresh" ? "observed" : "accepted";
    const continuity = next?.memoryContext?.memory_context?.continuity_signal ?? "n/a";
    setSessionRuns((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        status,
        readiness: next.contract?.readiness ?? null,
        confidence: next.contract?.confidence ?? null,
        fallbackUsed: false,
        guardrailState: next.contract?.readiness ?? null,
        fields: [
          { label: "action", value: action },
          { label: "event_count", value: String(next.count) },
          { label: "continuity_signal", value: continuity },
        ],
      },
      ...current,
    ]);
  }

  async function refresh(
    targetLocationId = locationId,
    action: "refresh" | "accepted" | "rejected" = "refresh",
  ) {
    if (!targetLocationId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/memory?locationId=${targetLocationId}&limit=20`);
      const body = (await response.json().catch(() => ({}))) as MemoryPayload;
      if (!response.ok) {
        setPayload(body);
        throw new Error((body as { error?: string }).error ?? "FAILED_TO_LOAD_MEMORY");
      }
      setPayload(body);
      setHistoryToken((value) => value + 1);
      appendSessionRun(body, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED_TO_LOAD_MEMORY");
    } finally {
      setLoading(false);
    }
  }

  async function record(
    state: "accepted" | "rejected",
    targetContext: { locationId: number | null; analyticsId: number | null } = { locationId, analyticsId },
  ) {
    if (!targetContext.analyticsId || !targetContext.locationId) return;
    setLoading(true);
    setError("");
    try {
      const recommendationId = `rec-${Date.now()}`;
      const response = await fetch("/api/agents/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locationId: targetContext.locationId,
          analyticsId: targetContext.analyticsId,
          recommendationId,
          sourceAgentId: "menu-profit-intelligence",
          state,
          rationale: state === "accepted" ? "approved_for_execution" : "risk_too_high",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "FAILED_TO_RECORD_MEMORY");
      }
      await refresh(targetContext.locationId, state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED_TO_RECORD_MEMORY");
    } finally {
      setLoading(false);
    }
  }

  async function runSampleContext() {
    const sample = resolveSampleContext({ locationId, analyticsId });
    applySampleContext({ setLocationId, setAnalyticsId });
    await record("accepted", sample);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Runner</CardTitle>
        <CardDescription>
          Track accepted/rejected recommendation signals across planning cycles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => record("accepted")} disabled={!contextState.canRun || loading}>
            Record Accepted
          </Button>
          <Button variant="outline" onClick={() => void runSampleContext()} disabled={loading}>
            Run Sample Context
          </Button>
          <Button
            variant="secondary"
            onClick={() => record("rejected")}
            disabled={!contextState.canRun || loading}
          >
            Record Rejected
          </Button>
          <Button variant="outline" onClick={() => void refresh()} disabled={!locationId || loading}>
            Refresh Memory
          </Button>
          <Badge
            data-selected-context-state={contextState.status}
            variant={contextState.status === "blocked" ? "destructive" : "secondary"}
          >
            selected context: {contextState.status}
          </Badge>
          {payload?.memoryContext?.memory_context?.continuity_signal ? (
            <Badge variant="secondary">
              continuity: {payload.memoryContext.memory_context.continuity_signal}
            </Badge>
          ) : null}
        </div>
        {contextState.status !== "ready" ? (
          <p className="text-xs text-muted-foreground">{contextState.reason}</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    v{event.version} · {event.recommendationId}
                  </p>
                  <Badge variant={event.state === "accepted" ? "default" : "secondary"}>
                    {event.state}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {event.sourceAgentId} · {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.rationale ? <p className="mt-2 text-sm">{event.rationale}</p> : null}
              </div>
            ))}
          </div>
        ) : payload ? (
          <p className="text-sm text-muted-foreground">No memory events yet.</p>
        ) : null}
        <OutputTrustPanel contract={payload?.contract} />
        <AgentRunHistoryPanel
          storageAgentId="agent-memory-tracker"
          locationId={locationId}
          analyticsId={analyticsId}
          refreshToken={historyToken}
        />
        <AgentRunComparisonPanel runs={sessionRuns} />
      </CardContent>
    </Card>
  );
}
