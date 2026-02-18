import { NextResponse } from "next/server";
import {
  loadPipelineFreshnessMetadata,
  resolveAnalyticsMaterialization,
} from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
} from "@/lib/contracts/decision-api-contract";

type Params = {
  params: Promise<{
    analyticsId: string;
  }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { analyticsId: analyticsIdParam } = await params;
  const analyticsId = Number(analyticsIdParam);

  if (!Number.isInteger(analyticsId)) {
    const context = createDecisionContext({
      persona: "analyst",
      analyticsId: null,
      trust: { qualityStatus: "failed", reasons: ["invalid_analytics_id"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_ANALYTICS_ID",
        contract: createDecisionApiContract({
          surface: "matrix",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 400 },
    );
  }

  const materialization = await resolveAnalyticsMaterialization({
    analyticsId,
    requiredField: "matrixJson",
  });
  if (!materialization) {
    const context = createDecisionContext({
      persona: "analyst",
      analyticsId,
      trust: { qualityStatus: "failed", reasons: ["analytics_not_found"] },
    });
    return NextResponse.json(
      {
        error: "ANALYTICS_NOT_FOUND",
        contract: createDecisionApiContract({
          surface: "matrix",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 404 },
    );
  }

  const metadata = await loadPipelineFreshnessMetadata(materialization.resolvedAnalyticsId);
  const trustQuality =
    metadata.qualityStatus === "passed" || metadata.qualityStatus === "warn" || metadata.qualityStatus === "failed"
      ? metadata.qualityStatus
      : "unknown";
  const context = createDecisionContext({
    persona: "analyst",
    locationId: materialization.locationId,
    analyticsId: materialization.resolvedAnalyticsId,
    trust: {
      qualityStatus: trustQuality,
      freshnessMinutes: metadata.freshnessMinutes,
      isStale: metadata.stale ?? false,
      reasons: metadata.pipelineRunId ? [] : ["missing_pipeline_run"],
    },
    lineage: {
      pipelineRunId: metadata.pipelineRunId,
      ingestedAtUtc: metadata.ingestedAtUtc,
      sourceSystem: "warehouse",
    },
  });
  const contract = createDecisionApiContract({
    surface: "matrix",
    context,
    evidence: [
      {
        source: "warehouse",
        entity: "warehouse.dim_pipeline_run",
        metric: "pipeline_run_id",
        value: metadata.pipelineRunId,
        key: {
          requestedAnalyticsId: analyticsId,
          resolvedAnalyticsId: materialization.resolvedAnalyticsId,
        },
        pipelineRunId: metadata.pipelineRunId,
      },
    ],
  });

  if (!metadata.pipelineRunId) {
    return NextResponse.json(
      {
        requested_analytics_id: analyticsId,
        analytics_id: materialization.resolvedAnalyticsId,
        materialization_fallback: materialization.fallbackApplied,
        pipeline_run_id: null,
        ingested_at_utc: null,
        quality_status: null,
        data_freshness_minutes: null,
        stale: null,
        contract,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    requested_analytics_id: analyticsId,
    analytics_id: materialization.resolvedAnalyticsId,
    materialization_fallback: materialization.fallbackApplied,
    pipeline_run_id: metadata.pipelineRunId,
    ingested_at_utc: metadata.ingestedAtUtc,
    quality_status: metadata.qualityStatus,
    data_freshness_minutes: metadata.freshnessMinutes,
    stale: metadata.stale,
    contract,
  });
}
