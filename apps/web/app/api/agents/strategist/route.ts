import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { buildWeeklyInstagramSuggestions } from "@/lib/analytics/instagram-weekly-suggestions";
import { loadPipelineFreshnessMetadata } from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
  mapAgentReadinessToTrust,
} from "@/lib/contracts/decision-api-contract";

type StrategistSuggestion = {
  rank: number;
  menu_item: string;
  suggested_for: string;
  suggested_daypart: "morning" | "lunch" | "afternoon" | "evening";
  offer_type: "combo_offer" | "happy_hour" | "hero_item";
  rationale: string;
  confidence: "high" | "medium" | "low";
};

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseWeekStart(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
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
  if (!input.pipelineRunId) {
    return { level: "blocked", reasonCode: "MISSING_PIPELINE_RUN" };
  }
  if (quality === "failed") {
    return { level: "blocked", reasonCode: "QUALITY_FAILED" };
  }
  if (quality === "warn") {
    return { level: "warn", reasonCode: "QUALITY_WARN" };
  }
  if (input.stale) {
    return { level: "warn", reasonCode: "DATA_STALE" };
  }
  return { level: "ready", reasonCode: "READY" };
}

function mapSuggestionsForAgent(
  suggestions: Array<{
    rank: number;
    menuItem: string;
    suggestedFor: string;
    suggestedDaypart: "morning" | "lunch" | "afternoon" | "evening";
    offerType: "combo_offer" | "happy_hour" | "hero_item";
    rationale: string;
    confidence: "high" | "medium" | "low";
  }>,
): StrategistSuggestion[] {
  return suggestions.map((item) => ({
    rank: item.rank,
    menu_item: item.menuItem,
    suggested_for: item.suggestedFor,
    suggested_daypart: item.suggestedDaypart,
    offer_type: item.offerType,
    rationale: item.rationale,
    confidence: item.confidence,
  }));
}

export async function GET(request: NextRequest) {
  const analyticsId = parseAnalyticsId(request.nextUrl.searchParams.get("analyticsId"));
  if (!analyticsId) {
    const context = createDecisionContext({
      persona: "marketer",
      trust: { qualityStatus: "failed", reasons: ["invalid_analytics_id"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_ANALYTICS_ID",
        contract: createDecisionApiContract({
          surface: "agent:marketer-strategist",
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
      heatmapJson: true,
    },
  });
  if (!analytics) {
    const context = createDecisionContext({
      persona: "marketer",
      analyticsId,
      trust: { qualityStatus: "failed", reasons: ["analytics_not_found"] },
    });
    return NextResponse.json(
      {
        error: "ANALYTICS_NOT_FOUND",
        contract: createDecisionApiContract({
          surface: "agent:marketer-strategist",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 404 },
    );
  }

  if (!analytics.matrixJson || !analytics.heatmapJson) {
    const context = createDecisionContext({
      persona: "marketer",
      locationId: analytics.locationId,
      analyticsId: analytics.id,
      trust: { qualityStatus: "failed", reasons: ["missing_required_materialization"] },
    });
    return NextResponse.json(
      {
        error: "MISSING_REQUIRED_MATERIALIZATION",
        contract: createDecisionApiContract({
          surface: "agent:marketer-strategist",
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
    persona: "marketer",
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

  const fallbackWeekStart = analytics.periodEnd ?? new Date();
  const weekStartDate = parseWeekStart(request.nextUrl.searchParams.get("weekStart"), fallbackWeekStart);
  const suggestions = buildWeeklyInstagramSuggestions({
    heatmapJson: analytics.heatmapJson,
    matrixJson: analytics.matrixJson,
    weekStartDate,
  });
  const mappedSuggestions = mapSuggestionsForAgent(suggestions);

  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");
  const upstream = await fetch(`${agentsApiUrl}/agents/strategist/weekly-plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      analytics_id: analytics.id,
      location_id: analytics.locationId,
      week_start_date: weekStartDate.toISOString().slice(0, 10),
      readiness: readiness.level === "blocked" ? "blocked" : readiness.level === "warn" ? "degraded" : "ready",
      suggestions: mappedSuggestions,
    }),
  });

  if (!upstream.ok) {
    const contract = createDecisionApiContract({
      surface: "agent:marketer-strategist",
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
      ],
    });
    return NextResponse.json(
      {
        error: "AGENTS_SERVICE_UNAVAILABLE",
        contract,
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
    surface: "agent:marketer-strategist",
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
        entity: "agent.marketer_strategist",
        metric: "weekly_suggestions_count",
        value: mappedSuggestions.length,
        key: { analyticsId: analytics.id, locationId: analytics.locationId },
        pipelineRunId: metadata.pipelineRunId,
      },
    ],
  });

  await prisma.agentOutput.upsert({
    where: {
      agentId_locationId_analyticsId: {
        agentId: "marketer-strategist",
        locationId: analytics.locationId,
        analyticsId: analytics.id,
      },
    },
    create: {
      agentId: "marketer-strategist",
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
    weekStartDate: weekStartDate.toISOString().slice(0, 10),
    contract,
    strategist: body,
  });
}
