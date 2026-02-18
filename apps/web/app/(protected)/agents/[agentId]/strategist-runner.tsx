"use client";

import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import type { DecisionApiContractDto } from "@/lib/contracts/decision-api-contract";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";
import { resolveSelectedContextState } from "./selected-context";
import { OutputTrustPanel } from "./output-trust-panel";
import { AgentRunHistoryPanel } from "./agent-run-history-panel";
import { AgentRunComparisonPanel } from "./agent-run-comparison-panel";
import type { SessionRunSnapshot } from "./run-comparison";

type StrategistPriority = {
  rank: number;
  menu_item: string;
  suggested_for: string;
  suggested_daypart: string;
  offer_type: string;
  rationale: string;
  confidence: string;
};

type StrategistResponse = {
  contract?: DecisionApiContractDto;
  strategist?: {
    status?: string;
    reason_code?: string;
    run?: {
      model_id?: string;
      prompt_version?: string;
      llm_provider?: string;
      llm_mode?: string;
      llm_status?: string;
    };
    plan?: { headline?: string; priorities?: StrategistPriority[] };
  };
};

export function StrategistRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<StrategistResponse | null>(null);
  const [historyToken, setHistoryToken] = useState(0);
  const [sessionRuns, setSessionRuns] = useState<SessionRunSnapshot[]>([]);

  const priorities = useMemo(
    () => payload?.strategist?.plan?.priorities ?? [],
    [payload],
  );
  const contextState = resolveSelectedContextState({ locationId, analyticsId });

  function appendSessionRun(next: StrategistResponse) {
    const prioritiesCount = next?.strategist?.plan?.priorities?.length ?? 0;
    const status = next?.strategist?.status ?? "unknown";
    const llmStatus = next?.strategist?.run?.llm_status ?? null;
    const fallbackUsed = llmStatus === "fallback";
    setSessionRuns((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        status,
        readiness: next.contract?.readiness ?? null,
        confidence: next.contract?.confidence ?? null,
        fallbackUsed,
        guardrailState: status !== "unknown" ? status : next.contract?.readiness ?? null,
        fields: [{ label: "priorities_count", value: String(prioritiesCount) }],
      },
      ...current,
    ]);
  }

  async function runStrategist(targetAnalyticsId = analyticsId) {
    if (!targetAnalyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/strategist?analyticsId=${targetAnalyticsId}`, {
        method: "GET",
      });
      const body = (await response.json().catch(() => ({}))) as StrategistResponse;
      if (!response.ok) {
        setPayload(body);
        throw new Error((body as { error?: string }).error ?? "FAILED_TO_RUN_STRATEGIST");
      }
      setPayload(body);
      setHistoryToken((value) => value + 1);
      appendSessionRun(body);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "FAILED_TO_RUN_STRATEGIST");
    } finally {
      setLoading(false);
    }
  }

  async function runSampleContext() {
    const sample = resolveSampleContext({ locationId, analyticsId });
    applySampleContext({ setLocationId, setAnalyticsId });
    await runStrategist(sample.analyticsId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Strategist Runner</CardTitle>
        <CardDescription>
          Generate a marketer-ready weekly Instagram plan from the selected analytics context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void runStrategist()} disabled={!contextState.canRun || loading}>
            {loading ? "Generating..." : "Generate Weekly Plan"}
          </Button>
          <Button variant="outline" onClick={() => void runSampleContext()} disabled={loading}>
            Run Sample Context
          </Button>
          <Badge
            data-selected-context-state={contextState.status}
            variant={contextState.status === "blocked" ? "destructive" : "secondary"}
          >
            selected context: {contextState.status}
          </Badge>
        </div>
        {contextState.status !== "ready" ? (
          <p className="text-xs text-muted-foreground">{contextState.reason}</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {payload?.strategist?.plan?.headline ? (
          <p className="text-sm text-muted-foreground">{payload.strategist.plan.headline}</p>
        ) : null}

        {priorities.length > 0 ? (
          <div className="space-y-3">
            {priorities.map((item) => (
              <div key={`${item.rank}-${item.menu_item}`} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    #{item.rank} {item.menu_item}
                  </p>
                  <Badge variant="secondary">{item.confidence}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.suggested_for} · {item.suggested_daypart} · {item.offer_type}
                </p>
                <p className="mt-2 text-sm">{item.rationale}</p>
              </div>
            ))}
          </div>
        ) : payload ? (
          <p className="text-sm text-muted-foreground">No actionable weekly priorities returned.</p>
        ) : null}
        <OutputTrustPanel
          contract={payload?.contract}
          fallbackUsed={payload?.strategist?.run?.llm_status === "fallback"}
          guardrailState={payload?.strategist?.status ?? null}
          runMetadata={payload?.strategist?.run ?? null}
        />
        <AgentRunHistoryPanel
          storageAgentId="marketer-strategist"
          locationId={locationId}
          analyticsId={analyticsId}
          refreshToken={historyToken}
        />
        <AgentRunComparisonPanel runs={sessionRuns} />
      </CardContent>
    </Card>
  );
}
