import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_RELEASE_GATE_THRESHOLDS,
  evaluateAgentReleaseGate,
  type ReleaseGateObservation,
} from "@/lib/agents/release-gate";

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function asReadiness(value: unknown): "ready" | "degraded" | "blocked" {
  if (value === "ready" || value === "degraded" || value === "blocked") return value;
  return "blocked";
}

function asConfidence(value: unknown): "high" | "medium" | "low" | "blocked" {
  if (value === "high" || value === "medium" || value === "low" || value === "blocked") return value;
  return "blocked";
}

async function loadObservation(
  baseUrl: string,
  workflowId: ReleaseGateObservation["workflowId"],
  path: string,
): Promise<ReleaseGateObservation> {
  const response = await fetch(`${baseUrl}${path}`);
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const contract =
    body.contract && typeof body.contract === "object" && !Array.isArray(body.contract)
      ? (body.contract as Record<string, unknown>)
      : null;

  const contractValid =
    contract !== null &&
    contract.contractVersion === "v1" &&
    typeof contract.generatedAtUtc === "string" &&
    Array.isArray(contract.evidence) &&
    typeof contract.context === "object";

  return {
    workflowId,
    readiness: asReadiness(contract?.readiness),
    confidence: asConfidence(contract?.confidence),
    evidenceCount: Array.isArray(contract?.evidence) ? contract.evidence.length : 0,
    contractValid,
    statusCode: response.status,
    reason: typeof body.error === "string" ? body.error : undefined,
  };
}

export async function GET(request: NextRequest) {
  const analyticsId = parseAnalyticsId(request.nextUrl.searchParams.get("analyticsId"));
  if (!analyticsId) {
    return NextResponse.json({ error: "INVALID_ANALYTICS_ID" }, { status: 400 });
  }

  const baseUrl = request.nextUrl.origin;
  const observations = await Promise.all([
    loadObservation(baseUrl, "strategist", `/api/agents/strategist?analyticsId=${analyticsId}`),
    loadObservation(baseUrl, "profit_intelligence", `/api/agents/profit-intelligence?analyticsId=${analyticsId}`),
    loadObservation(baseUrl, "consensus", `/api/agents/consensus?analyticsId=${analyticsId}&mode=conservative`),
    loadObservation(baseUrl, "simulation", `/api/agents/simulation?analyticsId=${analyticsId}&mode=conservative`),
  ]);

  const result = evaluateAgentReleaseGate(observations, DEFAULT_RELEASE_GATE_THRESHOLDS);

  return NextResponse.json({
    analyticsId,
    thresholds: DEFAULT_RELEASE_GATE_THRESHOLDS,
    observations,
    result,
  });
}
