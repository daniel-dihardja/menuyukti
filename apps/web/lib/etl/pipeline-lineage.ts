import { Prisma, PrismaClient } from "@prisma/client";
import { ETL_JOB_STATUS, type EtlJobStatus } from "@/lib/etl/pipeline-contract";

type LineageClient = PrismaClient | Prisma.TransactionClient;

type CreateLineageParams = {
  etlJobId: string;
  locationId: number;
  analyticsId?: number | null;
  pipelineRunId?: string | null;
  trigger: string;
  source: string;
  actor?: string;
  stage: string;
  inputRef?: Prisma.InputJsonValue;
};

type MarkLineageRunningParams = {
  etlJobId: string;
  stage: string;
};

type MarkLineageTerminalParams = {
  etlJobId: string;
  stage: string;
  status: EtlJobStatus;
  pipelineRunId?: string | null;
  analyticsId?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  outputRef?: Prisma.InputJsonValue;
};

function isTerminal(status: string): boolean {
  return status === ETL_JOB_STATUS.SUCCEEDED || status === ETL_JOB_STATUS.FAILED;
}

export async function createLineageForEtlJob(
  client: LineageClient,
  params: CreateLineageParams,
): Promise<void> {
  const run = await client.etlPipelineRun.upsert({
    where: { etlJobId: params.etlJobId },
    update: {
      locationId: params.locationId,
      analyticsId: params.analyticsId ?? null,
      pipelineRunId: params.pipelineRunId ?? null,
      trigger: params.trigger,
      source: params.source,
      actor: params.actor ?? null,
      status: ETL_JOB_STATUS.QUEUED,
      inputRef: params.inputRef,
    },
    create: {
      etlJobId: params.etlJobId,
      locationId: params.locationId,
      analyticsId: params.analyticsId ?? null,
      pipelineRunId: params.pipelineRunId ?? null,
      trigger: params.trigger,
      source: params.source,
      actor: params.actor ?? null,
      status: ETL_JOB_STATUS.QUEUED,
      inputRef: params.inputRef,
    },
    select: { id: true, locationId: true },
  });

  await client.etlPipelineStageExecution.upsert({
    where: {
      runId_stage_attempt: {
        runId: run.id,
        stage: params.stage,
        attempt: 1,
      },
    },
    update: {
      status: ETL_JOB_STATUS.QUEUED,
      trigger: params.trigger,
      source: params.source,
      actor: params.actor ?? null,
      inputRef: params.inputRef,
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    },
    create: {
      runId: run.id,
      locationId: run.locationId,
      stage: params.stage,
      status: ETL_JOB_STATUS.QUEUED,
      attempt: 1,
      trigger: params.trigger,
      source: params.source,
      actor: params.actor ?? null,
      inputRef: params.inputRef,
    },
  });
}

export async function markLineageRunningForEtlJob(
  client: LineageClient,
  params: MarkLineageRunningParams,
): Promise<void> {
  const run = await client.etlPipelineRun.findUnique({
    where: { etlJobId: params.etlJobId },
    select: {
      id: true,
      locationId: true,
      retryCount: true,
      stageExecutions: {
        where: { stage: params.stage },
        orderBy: { attempt: "desc" },
        take: 1,
        select: { id: true, status: true, attempt: true },
      },
    },
  });
  if (!run) return;

  const now = new Date();
  await client.etlPipelineRun.update({
    where: { id: run.id },
    data: {
      status: ETL_JOB_STATUS.RUNNING,
      startedAt: now,
      finishedAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  const latestStage = run.stageExecutions[0] ?? null;
  if (!latestStage) {
    await client.etlPipelineStageExecution.create({
      data: {
        runId: run.id,
        locationId: run.locationId,
        stage: params.stage,
        status: ETL_JOB_STATUS.RUNNING,
        attempt: 1,
        trigger: "manual_operation",
        source: "runtime",
        startedAt: now,
      },
    });
    return;
  }

  if (isTerminal(latestStage.status)) {
    await client.etlPipelineRun.update({
      where: { id: run.id },
      data: { retryCount: run.retryCount + 1 },
    });
    await client.etlPipelineStageExecution.create({
      data: {
        runId: run.id,
        locationId: run.locationId,
        stage: params.stage,
        status: ETL_JOB_STATUS.RUNNING,
        attempt: latestStage.attempt + 1,
        trigger: "manual_operation",
        source: "runtime",
        startedAt: now,
      },
    });
    return;
  }

  await client.etlPipelineStageExecution.update({
    where: { id: latestStage.id },
    data: {
      status: ETL_JOB_STATUS.RUNNING,
      startedAt: now,
      finishedAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });
}

export async function markLineageTerminalForEtlJob(
  client: LineageClient,
  params: MarkLineageTerminalParams,
): Promise<void> {
  const run = await client.etlPipelineRun.findUnique({
    where: { etlJobId: params.etlJobId },
    select: {
      id: true,
      locationId: true,
      stageExecutions: {
        where: { stage: params.stage },
        orderBy: { attempt: "desc" },
        take: 1,
        select: { id: true, attempt: true },
      },
    },
  });
  if (!run) return;

  const now = new Date();
  const latestStage = run.stageExecutions[0] ?? null;

  if (!latestStage) {
    await client.etlPipelineStageExecution.create({
      data: {
        runId: run.id,
        locationId: run.locationId,
        stage: params.stage,
        status: params.status,
        attempt: 1,
        trigger: "manual_operation",
        source: "runtime",
        startedAt: now,
        finishedAt: now,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        outputRef: params.outputRef,
      },
    });
  } else {
    await client.etlPipelineStageExecution.update({
      where: { id: latestStage.id },
      data: {
        status: params.status,
        finishedAt: now,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        outputRef: params.outputRef,
      },
    });
  }

  await client.etlPipelineRun.update({
    where: { id: run.id },
    data: {
      status: params.status,
      finishedAt: now,
      pipelineRunId: params.pipelineRunId ?? undefined,
      analyticsId: params.analyticsId ?? undefined,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      outputRef: params.outputRef,
    },
  });
}
