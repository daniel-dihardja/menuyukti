"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAnalytics } from "../../analytics/use-analytics";
import { applySampleContext, resolveSampleContext } from "./sample-context";

type RerankedRecommendation = {
  recommendation_id: string;
  menu_item: string;
  baseline_rank: number;
  final_rank: number;
  rank_delta: number;
  final_score: number;
  feedback_boost: number;
  explainability: {
    policy_version: string;
    fallback_to_baseline: boolean;
    explanation: string;
  };
};

type RerankedPayload = {
  reranked?: {
    policy_version?: string;
    fallback_to_baseline?: boolean;
    signal_count?: number;
    recommendations?: RerankedRecommendation[];
  };
};

export function RerankerRunner() {
  const { analyticsId, locationId, setAnalyticsId, setLocationId } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<RerankedPayload | null>(null);

  const recs = useMemo(() => payload?.reranked?.recommendations ?? [], [payload]);

  async function runRerank(targetAnalyticsId = analyticsId) {
    if (!targetAnalyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/profit-intelligence/reranked?analyticsId=${targetAnalyticsId}`);
      const body = (await response.json().catch(() => ({}))) as RerankedPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "FAILED_TO_RUN_RERANK");
      setPayload(body);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "FAILED_TO_RUN_RERANK");
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
      await runRerank(sample.analyticsId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Reranker Runner</CardTitle>
        <CardDescription>
          Re-rank baseline recommendations using outcome feedback priors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void runRerank()} disabled={!analyticsId || loading}>
            {loading ? "Re-ranking..." : "Run Re-ranking"}
          </Button>
          <Button variant="outline" onClick={() => void runSampleContext()} disabled={loading}>
            Run Sample Context
          </Button>
          {!analyticsId ? <Badge variant="secondary">Select analytics report first</Badge> : null}
          {payload?.reranked?.policy_version ? (
            <Badge variant="secondary">policy: {payload.reranked.policy_version}</Badge>
          ) : null}
          {typeof payload?.reranked?.fallback_to_baseline === "boolean" ? (
            <Badge variant={payload.reranked.fallback_to_baseline ? "secondary" : "default"}>
              fallback: {String(payload.reranked.fallback_to_baseline)}
            </Badge>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {recs.length > 0 ? (
          <div className="space-y-3">
            {recs.map((row) => (
              <div key={row.recommendation_id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{row.menu_item}</p>
                  <Badge variant="secondary">delta: {row.rank_delta}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  baseline #{row.baseline_rank} → final #{row.final_rank} · boost {row.feedback_boost}
                </p>
              </div>
            ))}
          </div>
        ) : payload ? (
          <p className="text-sm text-muted-foreground">No reranked recommendations.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
