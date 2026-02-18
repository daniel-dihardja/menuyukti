"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";

type Recommendation = {
  rank: number;
  menu_item: string;
  action: string;
  confidence: string;
  impact?: {
    expected_revenue_delta?: number;
    expected_margin_delta?: number;
  };
};

type ProfitIntelligenceResponse = {
  contract?: { readiness?: string };
  profitIntelligence?: {
    status?: string;
    board?: {
      headline?: string;
      recommendations?: Recommendation[];
    };
  };
  contextCoverage?: {
    cogsReadiness?: string;
  };
  decisionPackage?: {
    matrixExportUrl?: string;
    pairsExportUrl?: string;
    combosExportUrl?: string;
    attributionExportUrl?: string;
  };
};

export function ProfitIntelligenceRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ProfitIntelligenceResponse | null>(null);

  const recommendations = useMemo(
    () => payload?.profitIntelligence?.board?.recommendations ?? [],
    [payload],
  );

  async function runBoard(targetAnalyticsId = analyticsId) {
    if (!targetAnalyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/profit-intelligence?analyticsId=${targetAnalyticsId}`);
      const body = (await response.json().catch(() => ({}))) as ProfitIntelligenceResponse;
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "FAILED_TO_RUN_PROFIT_INTELLIGENCE");
      }
      setPayload(body);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "FAILED_TO_RUN_PROFIT_INTELLIGENCE");
    } finally {
      setLoading(false);
    }
  }

  async function runSampleContext() {
    const sample = resolveSampleContext({ locationId, analyticsId });
    applySampleContext({ setLocationId, setAnalyticsId });
    await runBoard(sample.analyticsId);
  }

  const exports = payload?.decisionPackage;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Intelligence Runner</CardTitle>
        <CardDescription>
          Generate an analyst action board with promote/improve/bundle/deprioritize priorities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void runBoard()} disabled={!analyticsId || loading}>
            {loading ? "Generating..." : "Generate Action Board"}
          </Button>
          <Button variant="outline" onClick={() => void runSampleContext()} disabled={loading}>
            Run Sample Context
          </Button>
          {!analyticsId ? <Badge variant="secondary">Select analytics report first</Badge> : null}
          {payload?.contract?.readiness ? (
            <Badge variant={payload.contract.readiness === "blocked" ? "destructive" : "secondary"}>
              readiness: {payload.contract.readiness}
            </Badge>
          ) : null}
          {payload?.contextCoverage?.cogsReadiness ? (
            <Badge variant="secondary">cogs: {payload.contextCoverage.cogsReadiness}</Badge>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {payload?.profitIntelligence?.board?.headline ? (
          <p className="text-sm text-muted-foreground">{payload.profitIntelligence.board.headline}</p>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  impact revenue: {item.impact?.expected_revenue_delta ?? 0} · margin:{" "}
                  {item.impact?.expected_margin_delta ?? 0}
                </p>
              </div>
            ))}
          </div>
        ) : payload ? (
          <p className="text-sm text-muted-foreground">No actionable profitability recommendations returned.</p>
        ) : null}

        {exports ? (
          <div className="flex flex-wrap gap-3 text-xs">
            {exports.matrixExportUrl ? <a className="underline" href={exports.matrixExportUrl}>Matrix Export</a> : null}
            {exports.pairsExportUrl ? <a className="underline" href={exports.pairsExportUrl}>Pairs Export</a> : null}
            {exports.combosExportUrl ? <a className="underline" href={exports.combosExportUrl}>Combos Export</a> : null}
            {exports.attributionExportUrl ? (
              <a className="underline" href={exports.attributionExportUrl}>Attribution Export</a>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
