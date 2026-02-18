import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";
import { loadPipelineFreshnessMetadata } from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
  mapAgentReadinessToTrust,
} from "@/lib/contracts/decision-api-contract";

type Mode = "conservative" | "aggressive";

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseMode(raw: string | null): Mode {
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
          surface: "agent:what-if-simulation",
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
      matrixJson: true,
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
          surface: "agent:what-if-simulation",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 404 },
    );
  }

  const matrixRows = toDecisionGradeMatrixRows(analytics.matrixJson);
  if (matrixRows.length === 0) {
    const context = createDecisionContext({
      persona: "analyst",
      locationId: analytics.locationId,
      analyticsId: analytics.id,
      trust: { qualityStatus: "failed", reasons: ["missing_matrix_materialization"] },
    });
    return NextResponse.json(
      {
        error: "MISSING_MATRIX_MATERIALIZATION",
        contract: createDecisionApiContract({
          surface: "agent:what-if-simulation",
          context,
          readiness: "blocked",
          confidence: "blocked",
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

  const rowsWithRevenue = matrixRows.filter((row) => row.revenue > 0);
  const baselineWeeklyPosts = mode === "aggressive" ? 6 : 4;
  const totalRevenue = rowsWithRevenue.reduce((sum, row) => sum + row.revenue, 0);
  const avgRevenuePerPost =
    rowsWithRevenue.length > 0
      ? Number((totalRevenue / rowsWithRevenue.length).toFixed(2))
      : 100;
  const avgMarginPct =
    rowsWithRevenue.length > 0
      ? Number(
          (
            rowsWithRevenue.reduce((sum, row) => sum + row.marginPct, 0) /
            rowsWithRevenue.length
          ).toFixed(4),
        )
      : 0.2;

  const scenarios = [
    {
      scenario_id: "scenario-balanced",
      name: "Balanced Growth",
      cadence_multiplier: mode === "aggressive" ? 1.2 : 1.05,
      item_focus_multiplier: 1.1,
      bundle_multiplier: 0.6,
      constraint_penalty: mode === "aggressive" ? 0.14 : 0.09,
      assumptions: [
        "regular posting rhythm",
        "menu focus on top margin items",
        "standard execution capacity",
      ],
    },
    {
      scenario_id: "scenario-promo-surge",
      name: "Promo Surge",
      cadence_multiplier: mode === "aggressive" ? 1.5 : 1.25,
      item_focus_multiplier: 1.22,
      bundle_multiplier: 1.0,
      constraint_penalty: mode === "aggressive" ? 0.24 : 0.18,
      assumptions: [
        "higher campaign cadence",
        "heavy hero/bundle mix",
        "increased execution load",
      ],
    },
  ];

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const upstream = await fetch(`${agentsApiUrl}/agents/simulation/what-if`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      analytics_id: analytics.id,
      location_id: analytics.locationId,
      readiness: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "degraded" : "ready",
      baseline: {
        weekly_posts: baselineWeeklyPosts,
        avg_margin_pct: avgMarginPct,
        avg_revenue_per_post: avgRevenuePerPost,
      },
      scenarios,
    }),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: "AGENTS_SERVICE_UNAVAILABLE",
        contract: createDecisionApiContract({
          surface: "agent:what-if-simulation",
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
    surface: "agent:what-if-simulation",
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
        source: "public_snapshot",
        entity: "public.analytics.matrix_json",
        metric: "matrix_row_count",
        value: matrixRows.length,
        key: { analyticsId: analytics.id, locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
      },
      {
        source: "derived_runtime",
        entity: "agent.what_if_simulation",
        metric: "scenario_count",
        value: scenarios.length,
        key: { analyticsId: analytics.id, mode },
        pipelineRunId: metadata.pipelineRunId,
      },
    ],
  });

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "what-if-simulation",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    create: {
      agentId: "what-if-simulation",
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
    baseline: {
      weeklyPosts: baselineWeeklyPosts,
      avgMarginPct,
      avgRevenuePerPost,
    },
    scenarios,
    contract,
    simulation: body,
  });
}
