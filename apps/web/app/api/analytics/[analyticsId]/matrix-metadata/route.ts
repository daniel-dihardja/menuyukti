import { NextResponse } from "next/server";
import {
  loadPipelineFreshnessMetadata,
  resolveAnalyticsMaterialization,
} from "@/lib/etl/latest-valid-materialization";

type Params = {
  params: Promise<{
    analyticsId: string;
  }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { analyticsId: analyticsIdParam } = await params;
  const analyticsId = Number(analyticsIdParam);

  if (!Number.isInteger(analyticsId)) {
    return NextResponse.json({ error: "INVALID_ANALYTICS_ID" }, { status: 400 });
  }

  const materialization = await resolveAnalyticsMaterialization({
    analyticsId,
    requiredField: "matrixJson",
  });
  if (!materialization) {
    return NextResponse.json({ error: "ANALYTICS_NOT_FOUND" }, { status: 404 });
  }

  const metadata = await loadPipelineFreshnessMetadata(materialization.resolvedAnalyticsId);
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
  });
}
