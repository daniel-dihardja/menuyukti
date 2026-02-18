import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";
import { summarizeCogsCoverage } from "@/lib/analytics/cogs-completeness";
import { evaluateCogsReadiness } from "@/lib/analytics/cogs-readiness";
import { loadInstagramAttribution } from "@/lib/analytics/instagram-attribution";
import { loadPipelineFreshnessMetadata } from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
  mapAgentReadinessToTrust,
} from "@/lib/contracts/decision-api-contract";

type CandidateAction = "promote" | "reprice" | "remove" | "keep" | "none";

type ProfitCandidate = {
  menu_item: string;
  matrix_action: CandidateAction;
  margin_pct: number;
  units_sold: number;
  revenue: number;
  impact_score: number;
  combo_supported: boolean;
  attribution_delta_revenue: number;
};

type ComboSignal = {
  menu_item_a_name: string;
  menu_item_b_name: string;
  combo_opportunity_score: number;
};

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
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

function toCandidateAction(raw: string | null): CandidateAction {
  if (raw === "promote" || raw === "reprice" || raw === "remove" || raw === "keep") return raw;
  return "none";
}

function scoreImpact(input: { marginPct: number; revenue: number; units: number; combo: boolean; attributionDelta: number }) {
  const margin = Math.max(0, Math.min(1, input.marginPct));
  const revenueNorm = Math.min(1, input.revenue / 3000);
  const unitsNorm = Math.min(1, input.units / 120);
  const comboBoost = input.combo ? 0.12 : 0;
  const attribution = Math.max(-0.2, Math.min(0.2, input.attributionDelta / 2000));
  const score = margin * 0.35 + revenueNorm * 0.25 + unitsNorm * 0.2 + comboBoost + attribution;
  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}

async function loadComboSignals(locationId: number): Promise<ComboSignal[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      menu_item_a_name: string;
      menu_item_b_name: string;
      combo_opportunity_score: number | string;
    }>
  >`
    SELECT
      menu_item_a_name,
      menu_item_b_name,
      combo_opportunity_score
    FROM marts.vw_combo_opportunity_candidates
    WHERE location_id = ${locationId}
    ORDER BY combo_opportunity_score DESC
    LIMIT 25
  `;

  return rows.map((row) => ({
    menu_item_a_name: row.menu_item_a_name,
    menu_item_b_name: row.menu_item_b_name,
    combo_opportunity_score: Number(row.combo_opportunity_score),
  }));
}

function normalizeMenuName(value: string): string {
  return value.trim().toLowerCase();
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
          surface: "agent:menu-profit-intelligence",
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
          surface: "agent:menu-profit-intelligence",
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
          surface: "agent:menu-profit-intelligence",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 409 },
    );
  }

  const metadata = await loadPipelineFreshnessMetadata(analytics.id);
  const baseReadiness = deriveAgentReadiness({
    qualityStatus: metadata.qualityStatus,
    stale: metadata.stale,
    pipelineRunId: metadata.pipelineRunId,
  });

  const cogsCoverage = summarizeCogsCoverage(
    matrixRows.map((row) => ({ cogs: row.cogs, revenue: row.revenue })),
  );
  const cogsReadiness = evaluateCogsReadiness(cogsCoverage);

  const effectiveReadiness: "ready" | "warn" | "blocked" =
    baseReadiness.level === "blocked" || cogsReadiness.readiness === "blocked"
      ? "blocked"
      : baseReadiness.level === "warn" || cogsReadiness.readiness === "degraded"
        ? "warn"
        : "ready";

  const effectiveReasonCode =
    baseReadiness.level === "blocked"
      ? baseReadiness.reasonCode
      : cogsReadiness.readiness === "blocked"
        ? "QUALITY_FAILED"
        : baseReadiness.level === "warn"
          ? baseReadiness.reasonCode
          : cogsReadiness.readiness === "degraded"
            ? "QUALITY_WARN"
            : "READY";

  const trust = mapAgentReadinessToTrust({
    level: effectiveReadiness,
    reasonCode: effectiveReasonCode,
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

  let comboSignals: ComboSignal[] = [];
  let comboContextError: string | null = null;
  try {
    comboSignals = await loadComboSignals(analytics.locationId);
  } catch {
    comboContextError = "combo_context_unavailable";
  }
  const comboMenuSet = new Set<string>();
  for (const row of comboSignals) {
    comboMenuSet.add(normalizeMenuName(row.menu_item_a_name));
    comboMenuSet.add(normalizeMenuName(row.menu_item_b_name));
  }

  let attributionByMenu = new Map<string, number>();
  let attributionContextError: string | null = null;
  try {
    const attributionRows = await loadInstagramAttribution({
      locationId: analytics.locationId,
      from: null,
      to: null,
      limit: 200,
    });
    attributionByMenu = attributionRows.reduce((acc, row) => {
      const key = normalizeMenuName(row.canonicalMenuName);
      const previous = acc.get(key) ?? 0;
      acc.set(key, previous + row.deltaRevenue);
      return acc;
    }, new Map<string, number>());
  } catch {
    attributionContextError = "attribution_context_unavailable";
  }

  const candidates: ProfitCandidate[] = matrixRows
    .map((row) => {
      const normalized = normalizeMenuName(row.menuItem);
      const attributionDelta = attributionByMenu.get(normalized) ?? 0;
      const comboSupported = comboMenuSet.has(normalized);
      const impactScore = scoreImpact({
        marginPct: row.marginPct,
        revenue: row.revenue,
        units: row.unitsSold,
        combo: comboSupported,
        attributionDelta,
      });
      return {
        menu_item: row.menuItem,
        matrix_action: toCandidateAction(row.action),
        margin_pct: row.marginPct,
        units_sold: row.unitsSold,
        revenue: row.revenue,
        impact_score: impactScore,
        combo_supported: comboSupported,
        attribution_delta_revenue: Number(attributionDelta.toFixed(2)),
      };
    })
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 25);

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const upstream = await fetch(`${agentsApiUrl}/agents/profit-intelligence/action-board`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      analytics_id: analytics.id,
      location_id: analytics.locationId,
      readiness: effectiveReadiness === "blocked" ? "blocked" : effectiveReadiness === "warn" ? "degraded" : "ready",
      cogs_readiness: cogsReadiness.readiness,
      candidates,
      combo_signals: comboSignals,
    }),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: "AGENTS_SERVICE_UNAVAILABLE",
        contract: createDecisionApiContract({
          surface: "agent:menu-profit-intelligence",
          context,
          readiness: effectiveReadiness === "blocked" ? "blocked" : effectiveReadiness === "warn" ? "degraded" : "ready",
          confidence: effectiveReadiness === "blocked" ? "blocked" : effectiveReadiness === "warn" ? "medium" : "high",
          evidence: [
            {
              source: "warehouse",
              entity: "warehouse.dim_pipeline_run",
              metric: "pipeline_run_id",
              value: metadata.pipelineRunId,
              key: { analyticsId: analytics.id },
              pipelineRunId: metadata.pipelineRunId,
            },
          ],
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
    surface: "agent:menu-profit-intelligence",
    context,
    readiness: effectiveReadiness === "blocked" ? "blocked" : effectiveReadiness === "warn" ? "degraded" : "ready",
    confidence: effectiveReadiness === "blocked" ? "blocked" : effectiveReadiness === "warn" ? "medium" : "high",
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
        source: "marts",
        entity: "marts.vw_combo_opportunity_candidates",
        metric: "combo_signal_count",
        value: comboSignals.length,
        key: { locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
        note: comboContextError,
      },
      {
        source: "marts",
        entity: "marts.vw_instagram_item_attribution_pre_post",
        metric: "attribution_item_count",
        value: attributionByMenu.size,
        key: { locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
        note: attributionContextError,
      },
      {
        source: "derived_runtime",
        entity: "agent.menu_profit_intelligence",
        metric: "candidate_count",
        value: candidates.length,
        key: { analyticsId: analytics.id, locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
      },
    ],
  });

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "menu-profit-intelligence",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    create: {
      agentId: "menu-profit-intelligence",
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

  const params = `analyticsId=${analytics.id}&locationId=${analytics.locationId}`;

  return NextResponse.json({
    analyticsId: analytics.id,
    locationId: analytics.locationId,
    contract,
    profitIntelligence: body,
    decisionPackage: {
      matrixExportUrl: `/api/exports/analyst?dataset=matrix&analyticsId=${analytics.id}`,
      pairsExportUrl: `/api/exports/analyst?dataset=pairs&locationId=${analytics.locationId}`,
      combosExportUrl: `/api/exports/analyst?dataset=combos&locationId=${analytics.locationId}`,
      attributionExportUrl: `/api/exports/analyst?dataset=attribution&analyticsId=${analytics.id}`,
      contextQuery: params,
    },
    contextCoverage: {
      cogsReadiness: cogsReadiness.readiness,
      comboSignals: comboSignals.length,
      attributionItems: attributionByMenu.size,
      comboContextError,
      attributionContextError,
    },
  });
}
