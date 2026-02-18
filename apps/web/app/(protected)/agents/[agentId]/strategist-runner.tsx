"use client";

import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";
import { resolveSelectedContextState } from "./selected-context";

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
  contract?: { readiness?: string; confidence?: string };
  strategist?: {
    status?: string;
    reason_code?: string;
    plan?: { headline?: string; priorities?: StrategistPriority[] };
  };
};

export function StrategistRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<StrategistResponse | null>(null);

  const priorities = useMemo(
    () => payload?.strategist?.plan?.priorities ?? [],
    [payload],
  );
  const contextState = resolveSelectedContextState({ locationId, analyticsId });

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
        throw new Error((body as { error?: string }).error ?? "FAILED_TO_RUN_STRATEGIST");
      }
      setPayload(body);
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
          {payload?.contract?.readiness ? (
            <Badge variant={payload.contract.readiness === "blocked" ? "destructive" : "secondary"}>
              readiness: {payload.contract.readiness}
            </Badge>
          ) : null}
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
      </CardContent>
    </Card>
  );
}
