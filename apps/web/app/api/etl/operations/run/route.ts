import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
  ETL_JOB_STATUS,
  ETL_STAGE_ERROR_CODE,
} from "@/lib/etl/pipeline-contract";
import {
  createLineageForEtlJob,
  markLineageRunningForEtlJob,
  markLineageTerminalForEtlJob,
} from "@/lib/etl/pipeline-lineage";

type OperationAction = "retry" | "replay" | "backfill";
const STALE_QUEUE_ERROR = ETL_STAGE_ERROR_CODE.STALE_QUEUED_OPERATION_TIMEOUT;

function resolveQueueStaleMinutes(): number {
  const parsed = Number(process.env.ETL_OPERATION_QUEUE_STALE_MINUTES ?? "30");
  if (!Number.isFinite(parsed) || parsed < 1) return 30;
  return Math.floor(parsed);
}

type OperationJob = {
  id: string;
  locationId: number;
  status: string;
  sourceFile: string | null;
  pipelineRunId: string | null;
  errorMessage: string | null;
};

function parseOperationSourceFile(raw: string | null): {
  isOperation: boolean;
  action: OperationAction | null;
  meta: Record<string, string>;
} {
  if (!raw?.startsWith("operation:")) {
    return { isOperation: false, action: null, meta: {} };
  }
  const [head, ...rest] = raw.split("|");
  const actionRaw = (head ?? "").replace("operation:", "").trim();
  const action: OperationAction | null =
    actionRaw === "retry" || actionRaw === "replay" || actionRaw === "backfill"
      ? actionRaw
      : null;
  const meta: Record<string, string> = {};
  for (const part of rest) {
    const [key, ...valueParts] = part.split("=");
    if (!key || valueParts.length === 0) continue;
    meta[key] = valueParts.join("=");
  }
  return { isOperation: true, action, meta };
}

async function ensureLineageExists(job: OperationJob): Promise<void> {
  await createLineageForEtlJob(prisma, {
    etlJobId: job.id,
    locationId: job.locationId,
    pipelineRunId: job.pipelineRunId,
    trigger: "manual_operation",
    source: "runner",
    actor: "api:etl_operations_run",
    stage: "matrix_materialization",
    inputRef: {
      pipelineRunId: job.pipelineRunId,
      sourceFile: job.sourceFile,
    },
  });
}

async function claimNextQueuedOperation(locationId: number | null): Promise<OperationJob | null> {
  const candidate = await prisma.etlJob.findFirst({
    where: {
      status: ETL_JOB_STATUS.QUEUED,
      sourceFile: { startsWith: "operation:" },
      ...(locationId == null ? {} : { locationId }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      locationId: true,
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
    stage: "matrix_materialization",
  });
  return { ...candidate, status: ETL_JOB_STATUS.RUNNING };
}

async function markFailed(jobId: string, message: string) {
  await prisma.$transaction(async (tx) => {
    await tx.etlJob.update({
      where: { id: jobId },
      data: {
        status: ETL_JOB_STATUS.FAILED,
        errorMessage: message.slice(0, 1024),
        finishedAt: new Date(),
      },
    });
    await markLineageTerminalForEtlJob(tx, {
      etlJobId: jobId,
      stage: "matrix_materialization",
      status: ETL_JOB_STATUS.FAILED,
      errorCode: message.split(":")[0] ?? ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_EXECUTION_FAILED,
      errorMessage: message.slice(0, 1024),
    });
  });
}

async function markSucceeded(jobId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.etlJob.update({
      where: { id: jobId },
      data: {
        status: ETL_JOB_STATUS.SUCCEEDED,
        errorMessage: null,
        finishedAt: new Date(),
      },
    });

    const etlJob = await tx.etlJob.findUnique({
      where: { id: jobId },
      select: { pipelineRunId: true, analyticsId: true },
    });

    await markLineageTerminalForEtlJob(tx, {
      etlJobId: jobId,
      stage: "matrix_materialization",
      status: ETL_JOB_STATUS.SUCCEEDED,
      pipelineRunId: etlJob?.pipelineRunId ?? null,
      analyticsId: etlJob?.analyticsId ?? null,
      outputRef: {
        pipelineRunId: etlJob?.pipelineRunId ?? null,
        analyticsId: etlJob?.analyticsId ?? null,
      },
    });
  });
}

async function resolveStaleQueuedOperations(locationId: number | null): Promise<number> {
  const staleMinutes = resolveQueueStaleMinutes();
  const cutoff = new Date(Date.now() - staleMinutes * 60_000);
  const staleJobs = await prisma.etlJob.findMany({
    where: {
      status: ETL_JOB_STATUS.QUEUED,
      sourceFile: { startsWith: "operation:" },
      createdAt: { lt: cutoff },
      ...(locationId == null ? {} : { locationId }),
    },
    select: { id: true },
  });

  for (const staleJob of staleJobs) {
    await markFailed(staleJob.id, `${STALE_QUEUE_ERROR}:${staleMinutes}m`);
  }
  return staleJobs.length;
}

async function executeReplay(job: OperationJob, meta: Record<string, string>) {
  const pipelineRunId = job.pipelineRunId ?? meta.pipelineRunId ?? "";
  if (!pipelineRunId) {
    throw new Error(ETL_STAGE_ERROR_CODE.RUNNER_REPLAY_REQUIRES_PIPELINE_RUN_ID);
  }

  const source = await prisma.etlJob.findFirst({
    where: {
      locationId: job.locationId,
      pipelineRunId,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, pipelineRunId: true },
  });
  if (!source) {
    throw new Error(ETL_STAGE_ERROR_CODE.RUNNER_SOURCE_PIPELINE_RUN_NOT_FOUND);
  }

  const functionRows = await prisma.$queryRaw<Array<{ available: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'warehouse'
        AND p.proname = 'refresh_fact_order_basket_pair'
    ) AS available
  `;
  if (functionRows[0]?.available) {
    await prisma.$queryRaw`
      SELECT warehouse.refresh_fact_order_basket_pair(
        CAST(${pipelineRunId} AS UUID)
      )
    `;
  }
}

async function executeClaimedOperation(job: OperationJob): Promise<{ action: string; status: string; error?: string }> {
  await ensureLineageExists(job);
  const parsed = parseOperationSourceFile(job.sourceFile);
  if (!parsed.isOperation || !parsed.action) {
    const message = ETL_STAGE_ERROR_CODE.RUNNER_INVALID_OPERATION_SOURCE_FILE;
    await markFailed(job.id, message);
    return { action: "unknown", status: ETL_JOB_STATUS.FAILED, error: message };
  }

  try {
    if (parsed.action === "replay") {
      await executeReplay(job, parsed.meta);
      await markSucceeded(job.id);
      return { action: parsed.action, status: ETL_JOB_STATUS.SUCCEEDED };
    }

    const unsupportedMessage = `${ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_HANDLER_NOT_IMPLEMENTED}:${parsed.action}`;
    await markFailed(job.id, unsupportedMessage);
    return {
      action: parsed.action,
      status: ETL_JOB_STATUS.FAILED,
      error: unsupportedMessage,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_EXECUTION_FAILED;
    await markFailed(job.id, message);
    return { action: parsed.action, status: ETL_JOB_STATUS.FAILED, error: message };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      locationId?: number;
      limit?: number;
    };
    const locationId =
      body.locationId == null ? null : Number.isInteger(Number(body.locationId)) ? Number(body.locationId) : null;
    if (body.locationId != null && locationId == null) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const parsedLimit = Number(body.limit ?? 1);
    const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 20)) : 1;

    const staleResolvedCount = await resolveStaleQueuedOperations(locationId);
    const processed: Array<{ id: string; action: string; status: string; error?: string }> = [];
    for (let idx = 0; idx < limit; idx += 1) {
      const job = await claimNextQueuedOperation(locationId);
      if (!job) break;
      const result = await executeClaimedOperation(job);
      processed.push({
        id: job.id,
        action: result.action,
        status: result.status,
        ...(result.error ? { error: result.error } : {}),
      });
    }

    return NextResponse.json(
      {
        staleResolvedCount,
        processedCount: processed.length,
        processed,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Run ETL operations queue error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
