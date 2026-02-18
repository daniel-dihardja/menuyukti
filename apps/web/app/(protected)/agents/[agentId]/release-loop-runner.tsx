"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useAnalytics } from "../../analytics/use-analytics";

type Stage = "shadow" | "canary" | "rollout";

type RecordDto = {
  id: string;
  stage: Stage;
  candidatePolicyVersion: string;
  baselinePolicyVersion: string;
  decision: "advance" | "hold" | "rollback";
  reasons: string[];
  rollbackToPolicyVersion: string | null;
  createdAt: string;
};

type ReleaseLoopPayload = {
  record?: RecordDto;
  decision?: {
    decision?: string;
    reasons?: string[];
    rollback_to_policy_version?: string | null;
  };
};

export function ReleaseLoopRunner() {
  const { analyticsId, locationId } = useAnalytics();
  const [stage, setStage] = useState<Stage>("shadow");
  const [simulateCanaryFailure, setSimulateCanaryFailure] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<RecordDto[]>([]);

  const latest = useMemo(() => records[0] ?? null, [records]);

  async function refresh() {
    if (!locationId) return;
    const response = await fetch(
      `/api/agents/learning/release-loop?locationId=${locationId}${analyticsId ? `&analyticsId=${analyticsId}` : ""}`,
    );
    const body = (await response.json().catch(() => ({}))) as { records?: RecordDto[] };
    if (!response.ok) throw new Error((body as { error?: string }).error ?? "FAILED_TO_LOAD_RELEASE_LOOP");
    setRecords(Array.isArray(body.records) ? body.records : []);
  }

  async function run() {
    if (!locationId || !analyticsId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agents/learning/release-loop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locationId,
          analyticsId,
          stage,
          candidatePolicyVersion: "as10-v2",
          baselinePolicyVersion: "as10-v1",
          simulateCanaryFailure,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ReleaseLoopPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "FAILED_TO_RUN_RELEASE_LOOP");
      await refresh();
      if (body.decision?.decision === "rollback") {
        setError(
          `Rollback triggered to ${body.decision.rollback_to_policy_version ?? "baseline"} (${(body.decision.reasons ?? []).join(", ")})`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED_TO_RUN_RELEASE_LOOP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Safe Learning Release Loop</CardTitle>
        <CardDescription>
          Run shadow/canary/rollout policy decisions with rollback controls and audit logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-40">
            <p className="mb-1 text-xs text-muted-foreground">Stage</p>
            <Select value={stage} onValueChange={(value) => setStage(value as Stage)}>
              <SelectTrigger aria-label="Release stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shadow">Shadow</SelectItem>
                <SelectItem value="canary">Canary</SelectItem>
                <SelectItem value="rollout">Rollout</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={!locationId || !analyticsId || loading}>
            {loading ? "Evaluating..." : "Run Release Decision"}
          </Button>
          <Button variant="outline" onClick={refresh} disabled={!locationId || loading}>
            Refresh Audit
          </Button>
          <Button
            variant={simulateCanaryFailure ? "destructive" : "secondary"}
            onClick={() => setSimulateCanaryFailure((prev) => !prev)}
            disabled={loading}
          >
            simulate canary failure: {String(simulateCanaryFailure)}
          </Button>
          {!locationId || !analyticsId ? (
            <Badge variant="secondary">Select location and report first</Badge>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {latest ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">
              Latest: {latest.stage} → {latest.decision}
            </p>
            <p className="text-xs text-muted-foreground">
              candidate {latest.candidatePolicyVersion} · baseline {latest.baselinePolicyVersion}
            </p>
            {latest.reasons.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">reasons: {latest.reasons.join(", ")}</p>
            ) : null}
            {latest.rollbackToPolicyVersion ? (
              <p className="mt-1 text-xs text-muted-foreground">
                rollback to: {latest.rollbackToPolicyVersion}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
