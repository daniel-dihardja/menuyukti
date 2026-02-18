import type { AgentOutput } from "@prisma/client";
import agents from "@/lib/agents.json";

export type AgentRunHistoryRecord = {
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

type AgentDefinition = {
  id: string;
  contract?: {
    promptContractVersion?: string;
  };
};

const promptVersionByAgentId = new Map(
  (agents as AgentDefinition[]).map((agent) => [agent.id, agent.contract?.promptContractVersion ?? null]),
);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractFallbackUsed(outputEnvelopeJson: unknown): boolean {
  const output = asRecord(outputEnvelopeJson);
  if (!output) return false;
  const reranked = asRecord(output.reranked);
  if (reranked?.fallback_to_baseline === true) return true;
  const decision = asRecord(output.decision);
  if (decision?.decision === "rollback") return true;
  return false;
}

function extractContractField(
  outputEnvelopeJson: unknown,
  field: "readiness" | "confidence",
): string | null {
  const output = asRecord(outputEnvelopeJson);
  const contract = asRecord(output?.contract);
  const value = contract?.[field];
  return typeof value === "string" ? value : null;
}

function resolvePromptVersion(agentId: string): string | null {
  if (agentId === "profit-intelligence-reranked") {
    return promptVersionByAgentId.get("feedback-reranker") ?? null;
  }
  return promptVersionByAgentId.get(agentId) ?? null;
}

export function toAgentRunHistoryRecord(row: AgentOutput): AgentRunHistoryRecord {
  return {
    agentId: row.agentId,
    locationId: row.locationId,
    analyticsId: row.analyticsId,
    runId: row.runId,
    runStatus: row.runStatus ?? "unknown",
    readiness: extractContractField(row.outputEnvelopeJson, "readiness"),
    confidence: extractContractField(row.outputEnvelopeJson, "confidence"),
    modelId: row.modelName ?? null,
    promptVersion: resolvePromptVersion(row.agentId),
    fallbackUsed: extractFallbackUsed(row.outputEnvelopeJson),
    timestamp: row.updatedAt.toISOString(),
  };
}
