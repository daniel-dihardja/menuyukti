import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "JOB_ID_REQUIRED" }, { status: 400 });
  }

  const job = await prisma.etlJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      sourceFile: true,
      errorMessage: true,
      pipelineRunId: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      analyticsId: true,
      locationId: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    source_file: job.sourceFile,
    error_message: job.errorMessage,
    pipeline_run_id: job.pipelineRunId,
    started_at: job.startedAt?.toISOString() ?? null,
    finished_at: job.finishedAt?.toISOString() ?? null,
    created_at: job.createdAt.toISOString(),
    analytics_id: job.analyticsId,
    location_id: job.locationId,
  });
}
