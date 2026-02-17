import { prisma } from "@/lib/prisma/client";

type RequiredJsonField = "matrixJson" | "heatmapJson";

export async function resolveAnalyticsMaterialization(params: {
  analyticsId: number;
  requiredField?: RequiredJsonField;
}): Promise<{
  requestedAnalyticsId: number;
  resolvedAnalyticsId: number;
  locationId: number;
  fallbackApplied: boolean;
} | null> {
  const requested = await prisma.analytics.findUnique({
    where: { id: params.analyticsId },
    select: {
      id: true,
      locationId: true,
      matrixJson: true,
      heatmapJson: true,
    },
  });
  if (!requested) return null;

  if (
    !params.requiredField ||
    (params.requiredField === "matrixJson" && requested.matrixJson) ||
    (params.requiredField === "heatmapJson" && requested.heatmapJson)
  ) {
    return {
      requestedAnalyticsId: requested.id,
      resolvedAnalyticsId: requested.id,
      locationId: requested.locationId,
      fallbackApplied: false,
    };
  }

  const fallbackCandidates = await prisma.analytics.findMany({
    where: {
      locationId: requested.locationId,
      id: { not: requested.id },
    },
    orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      locationId: true,
      matrixJson: true,
      heatmapJson: true,
    },
  });
  const fallback = fallbackCandidates.find((candidate) =>
    params.requiredField === "matrixJson" ? Boolean(candidate.matrixJson) : Boolean(candidate.heatmapJson),
  );

  if (!fallback) {
    return {
      requestedAnalyticsId: requested.id,
      resolvedAnalyticsId: requested.id,
      locationId: requested.locationId,
      fallbackApplied: false,
    };
  }

  return {
    requestedAnalyticsId: requested.id,
    resolvedAnalyticsId: fallback.id,
    locationId: fallback.locationId,
    fallbackApplied: true,
  };
}

export async function loadPipelineFreshnessMetadata(analyticsId: number): Promise<{
  pipelineRunId: string | null;
  ingestedAtUtc: string | null;
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  stale: boolean | null;
}> {
  const etlJob = await prisma.etlJob.findFirst({
    where: {
      analyticsId,
      status: "succeeded",
      pipelineRunId: { not: null },
    },
    orderBy: { finishedAt: "desc" },
    select: { pipelineRunId: true },
  });

  if (!etlJob?.pipelineRunId) {
    return {
      pipelineRunId: null,
      ingestedAtUtc: null,
      qualityStatus: null,
      freshnessMinutes: null,
      stale: null,
    };
  }

  const runRows = await prisma.$queryRaw<
    Array<{ ingested_at_utc: Date; quality_status: string }>
  >`
    SELECT ingested_at_utc, quality_status
    FROM warehouse.dim_pipeline_run
    WHERE pipeline_run_id = CAST(${etlJob.pipelineRunId} AS UUID)
    LIMIT 1
  `;
  const run = runRows[0];
  if (!run) {
    return {
      pipelineRunId: etlJob.pipelineRunId,
      ingestedAtUtc: null,
      qualityStatus: null,
      freshnessMinutes: null,
      stale: null,
    };
  }

  const freshnessMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(run.ingested_at_utc).getTime()) / 60_000),
  );
  const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
  const stale = freshnessMinutes > freshnessSlaMinutes;

  return {
    pipelineRunId: etlJob.pipelineRunId,
    ingestedAtUtc: new Date(run.ingested_at_utc).toISOString(),
    qualityStatus: run.quality_status,
    freshnessMinutes,
    stale,
  };
}
