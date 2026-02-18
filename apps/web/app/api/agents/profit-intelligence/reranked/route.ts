import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { listLearningSignalEvents } from "@/lib/agents/learning-repository";
import { loadPipelineFreshnessMetadata } from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
  mapAgentReadinessToTrust,
} from "@/lib/contracts/decision-api-contract";

type BaselineRecommendation = {
  recommendation_id?: unknown;
  rank?: unknown;
  menu_item?: unknown;
  action?: unknown;
  impact?: { expected_revenue_delta?: unknown; expected_margin_delta?: unknown };
};

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseMinSignals(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return 3;
  return Math.min(200, value);
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

export async function GET(request: NextRequest) {
  const analyticsId = parseAnalyticsId(request.nextUrl.searchParams.get("analyticsId"));
  if (!analyticsId) {
    const context = createDecisionContext({
      persona: "analyst",
      trust: { qualityStatus: "failed", reasons: ["invalid_analytics_id"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_ANALYTICS_ID",
        contract: createDecisionApiContract({
          surface: "agent:profit-intelligence-reranked",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 400 },
    );
  }
  const minSignals = parseMinSignals(request.nextUrl.searchParams.get("minSignals"));
  const policyVersion = request.nextUrl.searchParams.get("policyVersion") ?? "as10-v1";

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
          surface: "agent:profit-intelligence-reranked",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 404 },
    );
  }

  const baselineRow = await prisma.agentOutput.findUnique({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "menu-profit-intelligence",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    select: { outputs: true },
  });
  if (!baselineRow) {
    const context = createDecisionContext({
      persona: "analyst",
      locationId: analytics.locationId,
      analyticsId: analytics.id,
      trust: { qualityStatus: "warn", reasons: ["baseline_recommendations_missing"] },
    });
    return NextResponse.json(
      {
        error: "BASELINE_RECOMMENDATIONS_MISSING",
        hint: "Run Menu Profit Intelligence agent first.",
        contract: createDecisionApiContract({
          surface: "agent:profit-intelligence-reranked",
          context,
          readiness: "degraded",
          confidence: "medium",
        }),
      },
      { status: 409 },
    );
  }

  const baselineOutputs =
    baselineRow.outputs && typeof baselineRow.outputs === "object" && !Array.isArray(baselineRow.outputs)
      ? (baselineRow.outputs as Record<string, unknown>)
      : {};
  const board =
    baselineOutputs.board && typeof baselineOutputs.board === "object" && !Array.isArray(baselineOutputs.board)
      ? (baselineOutputs.board as Record<string, unknown>)
      : {};
  const recommendations = Array.isArray(board.recommendations)
    ? (board.recommendations as BaselineRecommendation[])
    : [];

  const baseline = recommendations.map((item, index) => {
    const recommendationId =
      typeof item.recommendation_id === "string" && item.recommendation_id.trim().length > 0
        ? item.recommendation_id.trim()
        : `rec:${String(item.menu_item ?? `item_${index + 1}`).toLowerCase().replace(/\s+/g, "_")}`;
    const expectedRevenueDelta = Number(item.impact?.expected_revenue_delta ?? 0);
    const expectedMarginDelta = Number(item.impact?.expected_margin_delta ?? 0);
    const baselineScore = Number(
      (Math.max(0, expectedRevenueDelta) * 0.005 + Math.max(0, expectedMarginDelta) * 0.01 + 0.4).toFixed(4),
    );

    return {
      recommendation_id: recommendationId,
      rank: Number(item.rank ?? index + 1),
      menu_item:
        typeof item.menu_item === "string" && item.menu_item.trim().length > 0
          ? item.menu_item.trim()
          : `Unknown ${index + 1}`,
      action:
        item.action === "promote" ||
        item.action === "improve" ||
        item.action === "bundle" ||
        item.action === "deprioritize"
          ? item.action
          : "promote",
      baseline_score: baselineScore,
    };
  });

  const learningEvents = await listLearningSignalEvents(prisma, {
    locationId: analytics.locationId,
    analyticsId: analytics.id,
    eligibleOnly: true,
    limit: 300,
  });
  const priors = baseline.map((item) => {
    const linked = learningEvents.filter(
      (event) =>
        event.signalType === "outcome_delta" &&
        (event.recommendationId === item.recommendation_id ||
          event.linkageKey.endsWith(`rec:${item.recommendation_id}`)),
    );
    const positive = linked.filter((event) => (event.outcomeDeltaRevenue ?? 0) > 0).length;
    const avgDelta =
      linked.length === 0
        ? 0
        : linked.reduce((sum, event) => sum + (event.outcomeDeltaRevenue ?? 0), 0) / linked.length;
    return {
      recommendation_id: item.recommendation_id,
      sample_size: linked.length,
      success_rate: linked.length === 0 ? 0.5 : positive / linked.length,
      avg_delta_revenue: Number(avgDelta.toFixed(2)),
    };
  });

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const upstream = await fetch(`${agentsApiUrl}/agents/rerank/recommendations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      policy_version: policyVersion,
      min_signal_count: minSignals,
      baseline,
      priors,
    }),
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: "AGENTS_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
  const reranked = (await upstream.json()) as Record<string, unknown>;

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

  const rerankedJson = JSON.parse(JSON.stringify(reranked)) as Prisma.InputJsonValue;
  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "profit-intelligence-reranked",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    create: {
      agentId: "profit-intelligence-reranked",
      locationId: analytics.locationId,
      analyticsId: analytics.id,
      outputs: rerankedJson,
      contractVersion: "v1",
      runStatus: "accepted",
      outputEnvelopeJson: rerankedJson,
    },
    update: {
      outputs: rerankedJson,
      contractVersion: "v1",
      runStatus: "accepted",
      outputEnvelopeJson: rerankedJson,
    },
  });

  return NextResponse.json({
    analyticsId: analytics.id,
    locationId: analytics.locationId,
    policyVersion,
    minSignals,
    signalCount: priors.filter((item) => item.sample_size > 0).length,
    contract: createDecisionApiContract({
      surface: "agent:profit-intelligence-reranked",
      context,
      readiness: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "degraded" : "ready",
      confidence: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "medium" : "high",
      evidence: [
        {
          source: "derived_runtime",
          entity: "agent.rerank",
          metric: "prior_count",
          value: priors.length,
          key: { analyticsId: analytics.id, policyVersion },
        },
      ],
    }),
    reranked,
  });
}
