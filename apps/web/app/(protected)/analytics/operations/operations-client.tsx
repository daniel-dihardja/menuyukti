"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { EtlRunRecord, EtlRunsListResponse } from "@/lib/etl/run-history";

type OperationAction = "retry" | "replay" | "backfill";

type OperationRecord = {
  id: string;
  action: OperationAction;
  status: string;
  locationId: number;
  pipelineRunId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
  errorMessage: string | null;
  meta: Record<string, string>;
};

type Props = {
  locations: Array<{ id: number; name: string }>;
};

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export function OperationsClient({ locations }: Props) {
  const [action, setAction] = useState<OperationAction>("retry");
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ? String(locations[0].id) : "");
  const [pipelineRunId, setPipelineRunId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [polling, setPolling] = useState(false);
  const [runStatusFilter, setRunStatusFilter] = useState<string>("all");
  const [runFromDateFilter, setRunFromDateFilter] = useState("");
  const [runToDateFilter, setRunToDateFilter] = useState("");
  const [runSearchFilter, setRunSearchFilter] = useState("");
  const [runFilterLocationId, setRunFilterLocationId] = useState<string>(
    locations[0]?.id ? String(locations[0].id) : "all",
  );
  const [runs, setRuns] = useState<EtlRunRecord[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsMessage, setRunsMessage] = useState("");
  const [runsNextCursor, setRunsNextCursor] = useState<string | null>(null);
  const [runsHasMore, setRunsHasMore] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runActionLoadingId, setRunActionLoadingId] = useState<string | null>(null);

  const runFilterLocationLabel = useMemo(() => {
    if (runFilterLocationId === "all") return "all locations";
    const location = locations.find((item) => String(item.id) === runFilterLocationId);
    return location?.name ?? `location ${runFilterLocationId}`;
  }, [locations, runFilterLocationId]);

  const canSubmit = useMemo(() => {
    if (!locationId) return false;
    if ((action === "retry" || action === "replay") && !pipelineRunId.trim()) return false;
    if (action === "backfill" && (!fromDate || !toDate)) return false;
    return true;
  }, [action, fromDate, locationId, pipelineRunId, toDate]);

  const fetchOperations = async () => {
    if (!locationId) return;
    setPolling(true);
    try {
      const res = await fetch(`/api/etl/operations?locationId=${encodeURIComponent(locationId)}&limit=50`);
      const data = (await res.json()) as { operations?: OperationRecord[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load operations");
      setOperations(data.operations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load operations");
    } finally {
      setPolling(false);
    }
  };

  useEffect(() => {
    void fetchOperations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchOperations();
    }, 10_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const fetchRuns = async (cursor?: string) => {
    setRunsLoading(true);
    setRunsMessage("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "25");
      if (runFilterLocationId !== "all") params.set("locationId", runFilterLocationId);
      if (runStatusFilter !== "all") params.set("status", runStatusFilter);
      if (runFromDateFilter) params.set("fromDate", runFromDateFilter);
      if (runToDateFilter) params.set("toDate", runToDateFilter);
      if (runSearchFilter.trim()) params.set("search", runSearchFilter.trim());
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/etl/runs?${params.toString()}`);
      const data = (await res.json()) as EtlRunsListResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load ETL runs");

      setRuns((prev) => (cursor ? prev.concat(data.runs ?? []) : (data.runs ?? [])));
      setRunsHasMore(Boolean(data.page?.hasMore));
      setRunsNextCursor(data.page?.nextCursor ?? null);
    } catch (error) {
      setRunsMessage(error instanceof Error ? error.message : "Failed to load ETL runs");
      if (!cursor) {
        setRuns([]);
        setRunsHasMore(false);
        setRunsNextCursor(null);
      }
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStatusFilter, runFromDateFilter, runToDateFilter, runSearchFilter, runFilterLocationId]);

  const queueRunShortcut = async (shortcutAction: "retry" | "replay", run: EtlRunRecord) => {
    if (!run.pipelineRunId) {
      setRunsMessage("Cannot trigger shortcut: selected run does not include pipelineRunId.");
      return;
    }
    setRunActionLoadingId(run.id);
    setRunsMessage("");
    try {
      const res = await fetch("/api/etl/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: shortcutAction,
          locationId: run.locationId,
          pipelineRunId: run.pipelineRunId,
          reason: `run-history-shortcut:${shortcutAction}:${run.id}`,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string; deduped?: boolean };
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed to queue operation shortcut");

      setRunsMessage(
        data.deduped
          ? `${shortcutAction} request reused existing idempotent operation.`
          : `${shortcutAction} request queued.`,
      );
      await Promise.all([fetchOperations(), fetchRuns()]);
    } catch (error) {
      setRunsMessage(error instanceof Error ? error.message : "Failed to queue operation shortcut");
    } finally {
      setRunActionLoadingId(null);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/etl/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          locationId: Number(locationId),
          pipelineRunId: pipelineRunId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          reason: reason || undefined,
        }),
      });
      const data = (await res.json()) as {
        operation?: OperationRecord;
        deduped?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Operation request failed");

      setMessage(data.deduped ? "Operation request reused existing idempotent record." : "Operation queued.");
      await fetchOperations();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trigger Operation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="op-location">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="op-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-action">Action</Label>
              <Select value={action} onValueChange={(value) => setAction(value as OperationAction)}>
                <SelectTrigger id="op-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retry">retry</SelectItem>
                  <SelectItem value="replay">replay</SelectItem>
                  <SelectItem value="backfill">backfill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(action === "retry" || action === "replay") ? (
              <div className="space-y-1.5">
                <Label htmlFor="op-pipeline-run">Pipeline run id</Label>
                <Input
                  id="op-pipeline-run"
                  value={pipelineRunId}
                  onChange={(event) => setPipelineRunId(event.target.value)}
                  placeholder="uuid"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="op-from-date">From date</Label>
                  <Input
                    id="op-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="op-to-date">To date</Label>
                  <Input
                    id="op-to-date"
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="op-reason">Reason (optional)</Label>
            <Input
              id="op-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why this operation is needed"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={submit} disabled={!canSubmit || loading}>
              {loading ? "Submitting..." : "Queue operation"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void fetchOperations()} disabled={polling}>
              {polling ? "Refreshing..." : "Refresh status"}
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline run</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No operations yet for this location.
                    </TableCell>
                  </TableRow>
                ) : (
                  operations.map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell>{operation.action}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(operation.status)}>{operation.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {operation.pipelineRunId ?? operation.meta.pipelineRunId ?? "—"}
                      </TableCell>
                      <TableCell>{new Date(operation.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{new Date(operation.updatedAt).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[26rem] text-xs text-muted-foreground">
                        {operation.errorMessage ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ETL Run History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="run-location">Location</Label>
              <Select value={runFilterLocationId} onValueChange={setRunFilterLocationId}>
                <SelectTrigger id="run-location">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-status">Status</Label>
              <Select value={runStatusFilter} onValueChange={setRunStatusFilter}>
                <SelectTrigger id="run-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">queued</SelectItem>
                  <SelectItem value="running">running</SelectItem>
                  <SelectItem value="succeeded">succeeded</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-from-date">From date</Label>
              <Input
                id="run-from-date"
                type="date"
                value={runFromDateFilter}
                onChange={(event) => setRunFromDateFilter(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-to-date">To date</Label>
              <Input
                id="run-to-date"
                type="date"
                value={runToDateFilter}
                onChange={(event) => setRunToDateFilter(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-search">Search pipeline/source</Label>
              <Input
                id="run-search"
                value={runSearchFilter}
                onChange={(event) => setRunSearchFilter(event.target.value)}
                placeholder="pipeline uuid or source text"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button type="button" variant="outline" onClick={() => void fetchRuns()} disabled={runsLoading}>
              {runsLoading ? "Refreshing..." : "Refresh run history"}
            </Button>
            <span>
              Showing {runs.length} run(s) for {runFilterLocationLabel}.
            </span>
          </div>

          {runsMessage ? <p className="text-sm text-destructive">{runsMessage}</p> : null}

          <div className="overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline run</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Error summary</TableHead>
                  <TableHead>Quality hints</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">
                      No ETL runs found for these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => {
                    const isExpanded = expandedRunId === run.id;
                    const disableRetry = run.status !== "failed" || !run.pipelineRunId;
                    const disableReplay = !run.pipelineRunId;
                    return (
                      <Fragment key={run.id}>
                        <TableRow>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{run.pipelineRunId ?? "—"}</TableCell>
                          <TableCell>{run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}</TableCell>
                          <TableCell>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "—"}</TableCell>
                          <TableCell>
                            {run.durationMs == null ? "—" : `${Math.round(run.durationMs / 1000)}s`}
                          </TableCell>
                          <TableCell className="max-w-[22rem] truncate text-xs text-muted-foreground">
                            {run.sourceFile ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[20rem] text-xs text-muted-foreground">
                            {run.errorSummary ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[18rem] text-xs text-muted-foreground">
                            {run.qualityHints.length > 0 ? run.qualityHints.join(", ") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                              >
                                {isExpanded ? "Hide" : "Details"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void queueRunShortcut("retry", run)}
                                disabled={disableRetry || runActionLoadingId === run.id}
                              >
                                Retry
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void queueRunShortcut("replay", run)}
                                disabled={disableReplay || runActionLoadingId === run.id}
                              >
                                Replay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow key={`${run.id}-detail`}>
                            <TableCell colSpan={9} className="bg-muted/20 text-xs">
                              <div className="space-y-1">
                                <p>
                                  <span className="font-medium">Run id:</span>{" "}
                                  <span className="font-mono">{run.id}</span>
                                </p>
                                <p>
                                  <span className="font-medium">Created:</span>{" "}
                                  {new Date(run.createdAt).toLocaleString()}
                                </p>
                                <p>
                                  <span className="font-medium">Analytics id:</span>{" "}
                                  {run.analyticsId ?? "—"}
                                </p>
                                <p>
                                  <span className="font-medium">Error message:</span>{" "}
                                  {run.errorMessage ?? "—"}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {runsHasMore ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchRuns(runsNextCursor ?? undefined)}
              disabled={runsLoading || !runsNextCursor}
            >
              {runsLoading ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
