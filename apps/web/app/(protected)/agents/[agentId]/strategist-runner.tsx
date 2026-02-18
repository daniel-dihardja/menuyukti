"use client";

import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useAnalytics } from "../../analytics/use-analytics";

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
  const { analyticsId } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<StrategistResponse | null>(null);

  const priorities = useMemo(
    () => payload?.strategist?.plan?.priorities ?? [],
    [payload],
  );

  async function runStrategist() {
    if (!analyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/strategist?analyticsId=${analyticsId}`, {
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
          <Button onClick={runStrategist} disabled={!analyticsId || loading}>
            {loading ? "Generating..." : "Generate Weekly Plan"}
          </Button>
          {!analyticsId ? (
            <Badge variant="secondary">Select analytics report first</Badge>
          ) : null}
          {payload?.contract?.readiness ? (
            <Badge variant={payload.contract.readiness === "blocked" ? "destructive" : "secondary"}>
              readiness: {payload.contract.readiness}
            </Badge>
          ) : null}
        </div>

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
