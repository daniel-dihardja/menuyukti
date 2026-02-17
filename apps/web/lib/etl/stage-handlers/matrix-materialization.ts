import { prisma } from "@/lib/prisma/client";
import { ETL_STAGE_ERROR_CODE } from "@/lib/etl/pipeline-contract";
import type { StageExecutionResult, StageJob } from "@/lib/etl/stage-runner";

type OperationAction = "retry" | "replay" | "backfill";

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

async function executeReplay(job: StageJob, meta: Record<string, string>): Promise<StageExecutionResult> {
  const pipelineRunId = job.pipelineRunId ?? meta.pipelineRunId ?? "";
  if (!pipelineRunId) {
    return {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.RUNNER_REPLAY_REQUIRES_PIPELINE_RUN_ID,
      errorMessage: ETL_STAGE_ERROR_CODE.RUNNER_REPLAY_REQUIRES_PIPELINE_RUN_ID,
      meta: { action: "replay" },
    };
  }

  const source = await prisma.etlJob.findFirst({
    where: {
      locationId: job.locationId,
      pipelineRunId,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!source) {
    return {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.RUNNER_SOURCE_PIPELINE_RUN_NOT_FOUND,
      errorMessage: ETL_STAGE_ERROR_CODE.RUNNER_SOURCE_PIPELINE_RUN_NOT_FOUND,
      meta: { action: "replay" },
    };
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

  return {
    status: "succeeded",
    pipelineRunId,
    analyticsId: job.analyticsId,
    outputRef: { pipelineRunId },
    meta: { action: "replay" },
  };
}

export async function executeMatrixMaterializationStageJob(job: StageJob): Promise<StageExecutionResult> {
  const parsed = parseOperationSourceFile(job.sourceFile);
  if (!parsed.isOperation || !parsed.action) {
    return {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.RUNNER_INVALID_OPERATION_SOURCE_FILE,
      errorMessage: ETL_STAGE_ERROR_CODE.RUNNER_INVALID_OPERATION_SOURCE_FILE,
      meta: { action: "unknown" },
    };
  }

  try {
    if (parsed.action === "replay") {
      return await executeReplay(job, parsed.meta);
    }

    return {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_HANDLER_NOT_IMPLEMENTED,
      errorMessage: `${ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_HANDLER_NOT_IMPLEMENTED}:${parsed.action}`,
      meta: { action: parsed.action },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_EXECUTION_FAILED;
    return {
      status: "failed",
      errorCode: ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_EXECUTION_FAILED,
      errorMessage: message,
      meta: { action: parsed.action },
    };
  }
}
