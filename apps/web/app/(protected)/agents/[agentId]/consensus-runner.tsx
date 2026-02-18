"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";
import { resolveSelectedContextState } from "./selected-context";

type Mode = "conservative" | "aggressive";

type ConsensusRecommendation = {
  rank: number;
  menu_item: string;
  action: string;
  confidence: string;
  consensus_score: number;
  strategy_score: number;
  risk_penalty: number;
};

type ConsensusResponse = {
  contract?: { readiness?: string };
  consensus?: {
    status?: string;
    consensus?: {
      winner?: ConsensusRecommendation | null;
      recommendations?: ConsensusRecommendation[];
      disagreement_reasons?: string[];
    };
  };
};

export function ConsensusRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [mode, setMode] = useState<Mode>("conservative");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ConsensusResponse | null>(null);

  const result = payload?.consensus?.consensus;
  const recommendations = useMemo(() => result?.recommendations ?? [], [result]);
  const contextState = resolveSelectedContextState({ locationId, analyticsId });

  async function runConsensus(targetAnalyticsId = analyticsId) {
    if (!targetAnalyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/consensus?analyticsId=${targetAnalyticsId}&mode=${mode}`);
      const body = (await response.json().catch(() => ({}))) as ConsensusResponse;
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "FAILED_TO_RUN_CONSENSUS");
      }
      setPayload(body);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "FAILED_TO_RUN_CONSENSUS");
    } finally {
      setLoading(false);
    }
  }

  async function runSampleContext() {
    const sample = resolveSampleContext({ locationId, analyticsId });
    applySampleContext({ setLocationId, setAnalyticsId });
    setLoading(true);
    setError("");
    try {
      const prime = await fetch(`/api/agents/profit-intelligence?analyticsId=${sample.analyticsId}`);
      if (!prime.ok) {
        throw new Error("FAILED_TO_PRIME_PROFIT_INTELLIGENCE");
      }
      await runConsensus(sample.analyticsId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consensus Runner</CardTitle>
        <CardDescription>
          Resolve strategy-vs-risk debate into a final recommendation set.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-44 space-y-1">
            <p className="text-xs text-muted-foreground">Mode</p>
            <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <SelectTrigger aria-label="Consensus mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void runConsensus()} disabled={!contextState.canRun || loading}>
            {loading ? "Resolving..." : "Run Consensus"}
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result?.winner ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">Winner: {result.winner.menu_item}</p>
            <p className="text-xs text-muted-foreground">
              action: {result.winner.action} · score: {result.winner.consensus_score}
            </p>
          </div>
        ) : null}

        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((item) => (
              <div key={`${item.rank}-${item.menu_item}`} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    #{item.rank} {item.menu_item}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{item.action}</Badge>
                    <Badge variant="secondary">{item.confidence}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  consensus {item.consensus_score} · strategy {item.strategy_score} · risk {item.risk_penalty}
                </p>
              </div>
            ))}
          </div>
        ) : payload ? (
          <p className="text-sm text-muted-foreground">No consensus recommendations available.</p>
        ) : null}

        {result?.disagreement_reasons?.length ? (
          <div className="text-xs text-muted-foreground">
            disagreement: {result.disagreement_reasons.join(", ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
