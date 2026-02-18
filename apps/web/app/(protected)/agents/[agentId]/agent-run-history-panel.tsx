"use client";

import { useEffect, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

type AgentRunHistoryRecord = {
  agentId: string;
  locationId: number;
  analyticsId: number;
  runId: string | null;
  runStatus: string;
  readiness: string | null;
  confidence: string | null;
  modelId: string | null;
  promptVersion: string | null;
  fallbackUsed: boolean;
  timestamp: string;
};

type Props = {
  storageAgentId: string;
  locationId: number | null;
  analyticsId: number | null;
  refreshToken?: number;
};

export function AgentRunHistoryPanel({
  storageAgentId,
  locationId,
  analyticsId,
  refreshToken = 0,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState<AgentRunHistoryRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!locationId || !analyticsId) {
        setRuns([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/agents/run-history?agentId=${encodeURIComponent(storageAgentId)}&locationId=${locationId}&analyticsId=${analyticsId}&limit=5`,
        );
        const body = (await response.json().catch(() => ({}))) as { runs?: AgentRunHistoryRecord[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "FAILED_TO_LOAD_RUN_HISTORY");
        if (!cancelled) setRuns(Array.isArray(body.runs) ? body.runs : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "FAILED_TO_LOAD_RUN_HISTORY");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [storageAgentId, locationId, analyticsId, refreshToken]);

  return (
    <Card data-agent-run-history-panel>
      <CardHeader>
        <CardTitle>Run History</CardTitle>
        <CardDescription>Recent agent runs for the selected context.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-xs text-muted-foreground">Loading run history...</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {runs.length === 0 && !loading && !error ? (
          <p className="text-xs text-muted-foreground">No runs for this context yet.</p>
        ) : null}
        {runs.map((run) => (
          <div
            key={`${run.runId ?? "no-run"}-${run.timestamp}`}
            data-agent-run-history-item
            className="rounded-md border p-3 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">status: {run.runStatus}</Badge>
              {run.readiness ? <Badge variant={run.readiness === "blocked" ? "destructive" : "secondary"}>{run.readiness}</Badge> : null}
              {run.confidence ? <Badge variant="secondary">{run.confidence}</Badge> : null}
              <Badge variant={run.fallbackUsed ? "secondary" : "default"}>fallback: {String(run.fallbackUsed)}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {new Date(run.timestamp).toLocaleString()} · run {run.runId ?? "n/a"} · model {run.modelId ?? "n/a"} · prompt{" "}
              {run.promptVersion ?? "n/a"}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
