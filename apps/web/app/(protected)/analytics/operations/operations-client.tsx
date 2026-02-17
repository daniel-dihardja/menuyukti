"use client";

import { useEffect, useMemo, useState } from "react";
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
    </section>
  );
}
