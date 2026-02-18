"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import type { DecisionApiContractDto } from "@/lib/contracts/decision-api-contract";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";
import { resolveSelectedContextState } from "./selected-context";
import { OutputTrustPanel } from "./output-trust-panel";

type Mode = "conservative" | "aggressive";

type RankedScenario = {
  scenario_id: string;
  name: string;
  assumptions: string[];
  metrics: {
    projected_revenue: number;
    projected_margin: number;
    expected_uplift: number;
  };
  confidence: {
    band: string;
    revenue_low: number;
    revenue_high: number;
    margin_low: number;
    margin_high: number;
  };
  simulation_score: number;
};

type SimulationResponse = {
  contract?: DecisionApiContractDto;
  simulation?: {
    status?: string;
    simulation?: {
      winner?: RankedScenario | null;
      ranked_scenarios?: RankedScenario[];
    };
  };
};

export function SimulationRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [mode, setMode] = useState<Mode>("conservative");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<SimulationResponse | null>(null);

  const result = payload?.simulation?.simulation;
  const scenarios = useMemo(() => result?.ranked_scenarios ?? [], [result]);
  const contextState = resolveSelectedContextState({ locationId, analyticsId });

  async function runSimulation(targetAnalyticsId = analyticsId) {
    if (!targetAnalyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/simulation?analyticsId=${targetAnalyticsId}&mode=${mode}`);
      const body = (await response.json().catch(() => ({}))) as SimulationResponse;
      if (!response.ok) {
        setPayload(body);
        throw new Error((body as { error?: string }).error ?? "FAILED_TO_RUN_SIMULATION");
      }
      setPayload(body);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "FAILED_TO_RUN_SIMULATION");
    } finally {
      setLoading(false);
    }
  }

  async function runSampleContext() {
    const sample = resolveSampleContext({ locationId, analyticsId });
    applySampleContext({ setLocationId, setAnalyticsId });
    await runSimulation(sample.analyticsId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What-If Simulation Runner</CardTitle>
        <CardDescription>
          Compare scenario outcomes before campaign execution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-44 space-y-1">
            <p className="text-xs text-muted-foreground">Mode</p>
            <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <SelectTrigger aria-label="Simulation mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void runSimulation()} disabled={!contextState.canRun || loading}>
            {loading ? "Simulating..." : "Run What-If"}
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result?.winner ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">Winner: {result.winner.name}</p>
            <p className="text-xs text-muted-foreground">
              projected revenue: {result.winner.metrics.projected_revenue} · score: {result.winner.simulation_score}
            </p>
          </div>
        ) : null}

        {scenarios.length > 0 ? (
          <div className="space-y-3">
            {scenarios.map((item) => (
              <div key={item.scenario_id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  <Badge variant="secondary">{item.confidence.band}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  revenue {item.metrics.projected_revenue} ({item.confidence.revenue_low} - {item.confidence.revenue_high})
                </p>
                <p className="text-xs text-muted-foreground">
                  margin {item.metrics.projected_margin} ({item.confidence.margin_low} - {item.confidence.margin_high})
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  assumptions: {item.assumptions.join(", ")}
                </p>
              </div>
            ))}
          </div>
        ) : payload ? (
          <p className="text-sm text-muted-foreground">No scenarios were returned.</p>
        ) : null}
        <OutputTrustPanel contract={payload?.contract} />
      </CardContent>
    </Card>
  );
}
