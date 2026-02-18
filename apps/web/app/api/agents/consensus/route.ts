import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { listRecentRecommendationMemory } from "@/lib/agents/memory-repository";
import { loadPipelineFreshnessMetadata } from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
  mapAgentReadinessToTrust,
} from "@/lib/contracts/decision-api-contract";

type ConsensusMode = "conservative" | "aggressive";

type ProfitRecommendation = {
  rank?: unknown;
  menu_item?: unknown;
  action?: unknown;
  confidence?: unknown;
  impact?: {
    expected_revenue_delta?: unknown;
    expected_margin_delta?: unknown;
  };
  evidence?: unknown;
};

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseMode(raw: string | null): ConsensusMode {
  if (raw === "aggressive") return "aggressive";
  return "conservative";
}

function deriveAgentReadiness(input: {
  qualityStatus: string | null;
  stale: boolean | null;
  pipelineRunId: string | null;
}): {
  level: "ready" | "warn" | "blocked";
  reasonCode: "READY" | "MISSING_PIPELINE_RUN" | "QUALITY_FAILED" | "QUALITY_WARN" | "DATA_STALE";
} {
  const quality = String(input.qualityStatus ?? "").toLowerCase();
  if (!input.pipelineRunId) return { level: "blocked", reasonCode: "MISSING_PIPELINE_RUN" };
  if (quality === "failed") return { level: "blocked", reasonCode: "QUALITY_FAILED" };
  if (quality === "warn") return { level: "warn", reasonCode: "QUALITY_WARN" };
  if (input.stale) return { level: "warn", reasonCode: "DATA_STALE" };
  return { level: "ready", reasonCode: "READY" };
}

function mapRiskFlags(
  recommendation: ProfitRecommendation,
  mode: ConsensusMode,
): string[] {
  const flags: string[] = [];
  const confidence = String(recommendation.confidence ?? "").toLowerCase();
  const marginDelta = Number(recommendation.impact?.expected_margin_delta ?? 0);
  if (confidence === "low") flags.push("low_confidence");
  if (marginDelta < 10) flags.push("low_margin_uplift");
  if (mode === "conservative" && confidence !== "high") flags.push("conservative_confidence_guard");
  return flags;
}

export async function GET(request: NextRequest) {
  const analyticsId = parseAnalyticsId(request.nextUrl.searchParams.get("analyticsId"));
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));

  if (!analyticsId) {
    const context = createDecisionContext({
      persona: "analyst",
      trust: { qualityStatus: "failed", reasons: ["invalid_analytics_id"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_ANALYTICS_ID",
        contract: createDecisionApiContract({
          surface: "agent:multi-agent-consensus",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 400 },
    );
  }

  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      id: true,
      locationId: true,
      periodStart: true,
      periodEnd: true,
    },
  });
  if (!analytics) {
    const context = createDecisionContext({
      persona: "analyst",
      analyticsId,
      trust: { qualityStatus: "failed", reasons: ["analytics_not_found"] },
    });
    return NextResponse.json(
      {
        error: "ANALYTICS_NOT_FOUND",
        contract: createDecisionApiContract({
          surface: "agent:multi-agent-consensus",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 404 },
    );
  }

  const source = await prisma.agentOutput.findUnique({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "menu-profit-intelligence",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    select: {
      outputs: true,
      runId: true,
    },
  });
  if (!source) {
    const context = createDecisionContext({
      persona: "analyst",
      locationId: analytics.locationId,
      analyticsId: analytics.id,
      trust: { qualityStatus: "warn", reasons: ["profit_intelligence_not_generated"] },
    });
    return NextResponse.json(
      {
        error: "PROFIT_INTELLIGENCE_NOT_GENERATED",
        hint: "Run Menu Profit Intelligence agent first.",
        contract: createDecisionApiContract({
          surface: "agent:multi-agent-consensus",
          context,
          readiness: "degraded",
          confidence: "medium",
        }),
      },
      { status: 409 },
    );
  }

  const metadata = await loadPipelineFreshnessMetadata(analytics.id);
  const readiness = deriveAgentReadiness({
    qualityStatus: metadata.qualityStatus,
    stale: metadata.stale,
    pipelineRunId: metadata.pipelineRunId,
  });
  const trust = mapAgentReadinessToTrust({
    level: readiness.level,
    reasonCode: readiness.reasonCode,
    qualityStatus: metadata.qualityStatus,
    freshnessMinutes: metadata.freshnessMinutes,
  });
  const context = createDecisionContext({
    persona: "analyst",
    locationId: analytics.locationId,
    analyticsId: analytics.id,
    from: analytics.periodStart?.toISOString() ?? null,
    to: analytics.periodEnd?.toISOString() ?? null,
    trust,
    lineage: {
      pipelineRunId: metadata.pipelineRunId,
      ingestedAtUtc: metadata.ingestedAtUtc,
      sourceSystem: "warehouse",
    },
  });
  const memoryEvents = await listRecentRecommendationMemory(prisma, {
    locationId: analytics.locationId,
    limit: 20,
  });

  const sourceOutputs =
    source.outputs && typeof source.outputs === "object" && !Array.isArray(source.outputs)
      ? (source.outputs as Record<string, unknown>)
      : {};
  const board =
    sourceOutputs.board &&
    typeof sourceOutputs.board === "object" &&
    !Array.isArray(sourceOutputs.board)
      ? (sourceOutputs.board as Record<string, unknown>)
      : {};
  const recommendations = Array.isArray(board.recommendations)
    ? (board.recommendations as ProfitRecommendation[])
    : [];

  const candidates = recommendations.slice(0, 10).map((item, idx) => ({
    rank: Number(item.rank ?? idx + 1),
    menu_item: String(item.menu_item ?? `Candidate ${idx + 1}`),
    action:
      item.action === "promote" || item.action === "improve" || item.action === "bundle" || item.action === "deprioritize"
        ? item.action
        : "promote",
    confidence:
      item.confidence === "high" || item.confidence === "medium" || item.confidence === "low" || item.confidence === "blocked"
        ? item.confidence
        : "medium",
    expected_revenue_delta: Number(item.impact?.expected_revenue_delta ?? 0),
    expected_margin_delta: Number(item.impact?.expected_margin_delta ?? 0),
    risk_flags: mapRiskFlags(item, mode),
  }));

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const upstream = await fetch(`${agentsApiUrl}/agents/consensus/debate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      analytics_id: analytics.id,
      location_id: analytics.locationId,
      readiness: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "degraded" : "ready",
      mode,
      candidates,
    }),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: "AGENTS_SERVICE_UNAVAILABLE",
        contract: createDecisionApiContract({
          surface: "agent:multi-agent-consensus",
          context,
          readiness: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "degraded" : "ready",
          confidence: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "medium" : "high",
        }),
      },
      { status: 503 },
    );
  }

  const body = (await upstream.json()) as Record<string, unknown>;
  const bodyJson = JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue;
  const run = body.run as Record<string, unknown> | undefined;
  const runId = typeof run?.run_id === "string" ? run.run_id : null;
  const modelName = typeof run?.model === "string" ? run.model : null;
  const runStatus = typeof body.status === "string" ? body.status : null;

  const contract = createDecisionApiContract({
    surface: "agent:multi-agent-consensus",
    context,
    readiness: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "degraded" : "ready",
    confidence: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "medium" : "high",
    evidence: [
      {
        source: "warehouse",
        entity: "warehouse.dim_pipeline_run",
        metric: "pipeline_run_id",
        value: metadata.pipelineRunId,
        key: { analyticsId: analytics.id },
        pipelineRunId: metadata.pipelineRunId,
      },
      {
        source: "derived_runtime",
        entity: "agent.menu_profit_intelligence",
        metric: "source_recommendation_count",
        value: recommendations.length,
        key: { analyticsId: analytics.id, locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
        note: source.runId ? `source_run_id:${source.runId}` : null,
      },
      {
        source: "derived_runtime",
        entity: "agent.memory_store",
        metric: "recent_memory_events_count",
        value: memoryEvents.length,
        key: { locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
      },
    ],
  });

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "multi-agent-consensus",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    create: {
      agentId: "multi-agent-consensus",
      locationId: analytics.locationId,
      analyticsId: analytics.id,
      outputs: bodyJson,
      contractVersion: "v1",
      runId,
      modelName,
      runStatus,
      outputEnvelopeJson: bodyJson,
    },
    update: {
      outputs: bodyJson,
      contractVersion: "v1",
      runId,
      modelName,
      runStatus,
      outputEnvelopeJson: bodyJson,
    },
  });

  return NextResponse.json({
    analyticsId: analytics.id,
    locationId: analytics.locationId,
    mode,
    memoryContext: {
      recentEventsCount: memoryEvents.length,
      recentAccepted: memoryEvents.filter((item) => item.state === "accepted").length,
      recentRejected: memoryEvents.filter((item) => item.state === "rejected").length,
    },
    contract,
    consensus: body,
  });
}
