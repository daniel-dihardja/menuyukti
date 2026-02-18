import { Badge } from "@workspace/ui/components/badge";
import type { DecisionApiContractDto } from "@/lib/contracts/decision-api-contract";

type Props = {
  contract: DecisionApiContractDto;
  fallbackApplied?: boolean;
  fallbackLabel?: string;
};

function readinessVariant(
  readiness: DecisionApiContractDto["readiness"],
): "default" | "secondary" | "destructive" {
  if (readiness === "ready") return "default";
  if (readiness === "degraded") return "secondary";
  return "destructive";
}

function confidenceVariant(
  confidence: DecisionApiContractDto["confidence"],
): "default" | "secondary" | "destructive" | "outline" {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "secondary";
  if (confidence === "low") return "outline";
  return "destructive";
}

export function DecisionContractBanner({
  contract,
  fallbackApplied = false,
  fallbackLabel,
}: Props) {
  return (
    <section className="mb-4 flex flex-wrap items-center gap-2">
      <Badge variant="outline">{contract.surface}</Badge>
      <Badge variant="outline">persona: {contract.context.persona}</Badge>
      <Badge variant={readinessVariant(contract.readiness)}>
        readiness: {contract.readiness}
      </Badge>
      <Badge variant={confidenceVariant(contract.confidence)}>
        confidence: {contract.confidence}
      </Badge>
      <Badge variant="outline">
        quality: {contract.context.trust.qualityStatus}
      </Badge>
      {contract.context.trust.freshnessMinutes !== null ? (
        <Badge variant={contract.context.trust.isStale ? "destructive" : "secondary"}>
          freshness: {contract.context.trust.freshnessMinutes}m
        </Badge>
      ) : null}
      <Badge variant="outline">evidence: {contract.evidence.length}</Badge>
      {fallbackApplied ? (
        <Badge variant="secondary">{fallbackLabel ?? "using latest valid materialization"}</Badge>
      ) : null}
    </section>
  );
}
