import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

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

  const job = await prisma.etlJob.findFirst({
    where: {
      analyticsId,
      status: "succeeded",
      pipelineRunId: { not: null },
    },
    orderBy: { finishedAt: "desc" },
    select: {
      pipelineRunId: true,
      finishedAt: true,
    },
  });

  if (!job?.pipelineRunId) {
    return NextResponse.json(
      {
        analytics_id: analyticsId,
        pipeline_run_id: null,
        ingested_at_utc: null,
        quality_status: null,
        data_freshness_minutes: null,
        stale: null,
      },
      { status: 200 },
    );
  }

  const runRows = await prisma.$queryRaw<
    Array<{ ingested_at_utc: Date; quality_status: string }>
  >`
    SELECT ingested_at_utc, quality_status
    FROM warehouse.dim_pipeline_run
    WHERE pipeline_run_id = CAST(${job.pipelineRunId} AS UUID)
    LIMIT 1
  `;

  const run = runRows[0];
  if (!run) {
    return NextResponse.json(
      {
        analytics_id: analyticsId,
        pipeline_run_id: job.pipelineRunId,
        ingested_at_utc: null,
        quality_status: null,
        data_freshness_minutes: null,
        stale: null,
      },
      { status: 200 },
    );
  }

  const freshnessMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(run.ingested_at_utc).getTime()) / 60_000),
  );
  const freshnessSlaMinutes = Number(
    process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440",
  );
  const stale = freshnessMinutes > freshnessSlaMinutes;

  return NextResponse.json({
    analytics_id: analyticsId,
    pipeline_run_id: job.pipelineRunId,
    ingested_at_utc: new Date(run.ingested_at_utc).toISOString(),
    quality_status: run.quality_status,
    data_freshness_minutes: freshnessMinutes,
    stale,
  });
}
