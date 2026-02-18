"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { buildRunComparisonRows, type SessionRunSnapshot } from "./run-comparison";

type Props = {
  runs: SessionRunSnapshot[];
};

export function AgentRunComparisonPanel({ runs }: Props) {
  const defaultLeft = runs[0]?.id ?? "";
  const defaultRight = runs[1]?.id ?? runs[0]?.id ?? "";
  const [leftId, setLeftId] = useState(defaultLeft);
  const [rightId, setRightId] = useState(defaultRight);

  const left = useMemo(
    () => runs.find((run) => run.id === leftId) ?? runs[0] ?? null,
    [runs, leftId],
  );
  const right = useMemo(
    () => runs.find((run) => run.id === rightId) ?? runs[1] ?? runs[0] ?? null,
    [runs, rightId],
  );

  const rows = useMemo(
    () => (left && right ? buildRunComparisonRows(left, right) : []),
    [left, right],
  );

  return (
    <Card data-agent-run-comparison-panel>
      <CardHeader>
        <CardTitle>Run Comparison</CardTitle>
        <CardDescription>Compare two runs in this session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {runs.length < 2 ? (
          <p className="text-xs text-muted-foreground">Run this agent at least twice to compare outputs.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Run A</p>
                <Select value={leftId} onValueChange={setLeftId}>
                  <SelectTrigger data-run-compare-select="left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {new Date(run.timestamp).toLocaleTimeString()} · {run.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Run B</p>
                <Select value={rightId} onValueChange={setRightId}>
                  <SelectTrigger data-run-compare-select="right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {new Date(run.timestamp).toLocaleTimeString()} · {run.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div data-run-compare-diff className="space-y-2">
              {rows.map((row) => (
                <div key={row.label} className="rounded-md border p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.label}</p>
                    <Badge variant={row.changed ? "secondary" : "outline"}>
                      {row.changed ? "changed" : "same"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    A: {row.leftValue} · B: {row.rightValue}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
