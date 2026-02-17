import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { ETL_JOB_STATUS, ETL_STAGE_ERROR_CODE, type EtlPipelineStage } from "@/lib/etl/pipeline-contract";
import {
  markLineageRunningForEtlJob,
  markLineageTerminalForEtlJob,
} from "@/lib/etl/pipeline-lineage";

export type StageJob = {
  id: string;
  locationId: number;
  analyticsId: number | null;
  status: string;
  sourceFile: string | null;
  pipelineRunId: string | null;
  errorMessage: string | null;
};

export type StageExecutionResult = {
  status: "succeeded" | "failed";
  errorCode?: string;
  errorMessage?: string;
  pipelineRunId?: string | null;
  analyticsId?: number | null;
  outputRef?: Prisma.InputJsonValue;
  meta?: Prisma.InputJsonValue;
};

type RunQueuedStageJobsParams = {
  stage: EtlPipelineStage;
  sourcePrefix: string;
  locationId: number | null;
  limit: number;
  execute: (job: StageJob) => Promise<StageExecutionResult>;
};

type ResolveStaleQueuedStageJobsParams = {
  stage: EtlPipelineStage;
  sourcePrefix: string;
  locationId: number | null;
  staleMinutes: number;
};

type ResolveStaleRunningStageJobsParams = {
  stage: EtlPipelineStage;
  sourcePrefix: string;
  locationId: number | null;
  staleMinutes: number;
};

async function claimNextQueuedStageJob(
  stage: EtlPipelineStage,
  sourcePrefix: string,
  locationId: number | null,
): Promise<StageJob | null> {
  const candidate = await prisma.etlJob.findFirst({
    where: {
      status: ETL_JOB_STATUS.QUEUED,
      sourceFile: { startsWith: sourcePrefix },
      ...(locationId == null ? {} : { locationId }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      locationId: true,
      analyticsId: true,
      status: true,
      sourceFile: true,
      pipelineRunId: true,
      errorMessage: true,
    },
  });
  if (!candidate) return null;

  const claimed = await prisma.etlJob.updateMany({
    where: { id: candidate.id, status: ETL_JOB_STATUS.QUEUED },
    data: {
      status: ETL_JOB_STATUS.RUNNING,
      startedAt: new Date(),
    },
  });
  if (claimed.count === 0) return null;

  await markLineageRunningForEtlJob(prisma, {
    etlJobId: candidate.id,
    stage,
  });

  return {
    ...candidate,
    status: ETL_JOB_STATUS.RUNNING,
  };
}

export async function markStageJobRunning(jobId: string, stage: EtlPipelineStage): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.etlJob.update({
      where: { id: jobId },
      data: {
        status: ETL_JOB_STATUS.RUNNING,
        startedAt: new Date(),
      },
    });
    await markLineageRunningForEtlJob(tx, { etlJobId: jobId, stage });
  });
}

export async function markStageJobTerminal(
  jobId: string,
  stage: EtlPipelineStage,
  result: StageExecutionResult,
): Promise<void> {
  const errorMessage = result.errorMessage?.slice(0, 1024) ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.etlJob.update({
      where: { id: jobId },
      data: {
        status: result.status === "succeeded" ? ETL_JOB_STATUS.SUCCEEDED : ETL_JOB_STATUS.FAILED,
        errorMessage: result.status === "succeeded" ? null : errorMessage,
        pipelineRunId: result.pipelineRunId === undefined ? undefined : result.pipelineRunId,
        analyticsId: result.analyticsId === undefined ? undefined : result.analyticsId,
        finishedAt: new Date(),
      },
    });

    await markLineageTerminalForEtlJob(tx, {
      etlJobId: jobId,
      stage,
      status: result.status === "succeeded" ? ETL_JOB_STATUS.SUCCEEDED : ETL_JOB_STATUS.FAILED,
      pipelineRunId: result.pipelineRunId ?? null,
      analyticsId: result.analyticsId ?? null,
      errorCode: result.status === "failed" ? (result.errorCode ?? ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_EXECUTION_FAILED) : null,
      errorMessage,
      outputRef: result.outputRef,
    });
  });
}

export async function resolveStaleQueuedStageJobs(
  params: ResolveStaleQueuedStageJobsParams,
): Promise<number> {
  const cutoff = new Date(Date.now() - params.staleMinutes * 60_000);
  const staleJobs = await prisma.etlJob.findMany({
    where: {
      status: ETL_JOB_STATUS.QUEUED,
      sourceFile: { startsWith: params.sourcePrefix },
      createdAt: { lt: cutoff },
      ...(params.locationId == null ? {} : { locationId: params.locationId }),
    },
    select: { id: true },
  });

  for (const staleJob of staleJobs) {
    await markStageJobTerminal(staleJob.id, params.stage, {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.STALE_QUEUED_OPERATION_TIMEOUT,
      errorMessage: `${ETL_STAGE_ERROR_CODE.STALE_QUEUED_OPERATION_TIMEOUT}:${params.staleMinutes}m`,
    });
  }

  return staleJobs.length;
}

export async function resolveStaleRunningStageJobs(
  params: ResolveStaleRunningStageJobsParams,
): Promise<number> {
  const cutoff = new Date(Date.now() - params.staleMinutes * 60_000);
  const staleJobs = await prisma.etlJob.findMany({
    where: {
      status: ETL_JOB_STATUS.RUNNING,
      sourceFile: { startsWith: params.sourcePrefix },
      startedAt: { lt: cutoff },
      ...(params.locationId == null ? {} : { locationId: params.locationId }),
    },
    select: { id: true },
  });

  for (const staleJob of staleJobs) {
    await markStageJobTerminal(staleJob.id, params.stage, {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.STALE_RUNNING_OPERATION_TIMEOUT,
      errorMessage: `${ETL_STAGE_ERROR_CODE.STALE_RUNNING_OPERATION_TIMEOUT}:${params.staleMinutes}m`,
    });
  }

  return staleJobs.length;
}

export async function runQueuedStageJobs(params: RunQueuedStageJobsParams): Promise<{
  processed: Array<{ id: string; result: StageExecutionResult }>;
}> {
  const processed: Array<{ id: string; result: StageExecutionResult }> = [];
  for (let idx = 0; idx < params.limit; idx += 1) {
    const job = await claimNextQueuedStageJob(params.stage, params.sourcePrefix, params.locationId);
    if (!job) break;
    const result = await params.execute(job);
    await markStageJobTerminal(job.id, params.stage, result);
    processed.push({ id: job.id, result });
  }
  return { processed };
}
