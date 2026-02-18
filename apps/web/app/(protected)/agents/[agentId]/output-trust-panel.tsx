"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import type { DecisionApiContractDto } from "@/lib/contracts/decision-api-contract";

type Props = {
  contract?: DecisionApiContractDto | null;
  fallbackUsed?: boolean;
  guardrailState?: string | null;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function OutputTrustPanel({ contract, fallbackUsed = false, guardrailState = null }: Props) {
  if (!contract) return null;

  const trust = contract.context?.trust;
  const lineage = contract.context?.lineage;
  const reasons = trust?.reasons ?? [];
  const evidence = Array.isArray(contract.evidence) ? contract.evidence : [];

  return (
    <Card data-agent-output-trust-panel>
      <CardHeader>
        <CardTitle>Output Trust</CardTitle>
        <CardDescription>
          Confidence, readiness, evidence, lineage, and guardrail state for this run.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge data-trust-readiness variant={contract.readiness === "blocked" ? "destructive" : "secondary"}>
            readiness: {contract.readiness}
          </Badge>
          <Badge data-trust-confidence variant="secondary">
            confidence: {contract.confidence}
          </Badge>
          <Badge data-trust-guardrail variant={guardrailState === "blocked" ? "destructive" : "secondary"}>
            guardrail: {guardrailState ?? contract.readiness}
          </Badge>
          <Badge data-trust-fallback variant={fallbackUsed ? "secondary" : "default"}>
            fallback: {String(fallbackUsed)}
          </Badge>
        </div>

        <div data-trust-lineage className="text-xs text-muted-foreground">
          lineage: run {lineage?.pipelineRunId ?? "n/a"} · source {lineage?.sourceSystem ?? "n/a"} · ingested{" "}
          {lineage?.ingestedAtUtc ?? "n/a"}
        </div>

        <div data-trust-reasons className="text-xs text-muted-foreground">
          reasons: {reasons.length > 0 ? reasons.join(", ") : "none"}
        </div>

        <div data-trust-evidence className="space-y-1 text-xs text-muted-foreground">
          {evidence.length > 0 ? (
            evidence.slice(0, 3).map((item, index) => (
              <p key={`${item.entity}-${item.metric}-${index}`}>
                {item.entity}.{item.metric} = {formatValue(item.value)}
              </p>
            ))
          ) : (
            <p>no evidence refs</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
