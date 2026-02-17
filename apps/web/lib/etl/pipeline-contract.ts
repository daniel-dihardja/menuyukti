export const ETL_PIPELINE_STAGES = [
  "upload_ingest",
  "cogs_enrichment",
  "matrix_materialization",
] as const;

export type EtlPipelineStage = (typeof ETL_PIPELINE_STAGES)[number];

export const ETL_STAGE_DEPENDENCIES: Record<EtlPipelineStage, readonly EtlPipelineStage[]> = {
  upload_ingest: [],
  cogs_enrichment: ["upload_ingest"],
  matrix_materialization: ["upload_ingest", "cogs_enrichment"],
};

export const ETL_STAGE_TRIGGERS = ["upload_complete", "cogs_saved", "manual_operation"] as const;

export type EtlStageTrigger = (typeof ETL_STAGE_TRIGGERS)[number];

export const ETL_STAGE_TRIGGER_SEMANTICS: Record<EtlPipelineStage, readonly EtlStageTrigger[]> = {
  upload_ingest: ["upload_complete", "manual_operation"],
  cogs_enrichment: ["cogs_saved", "manual_operation"],
  matrix_materialization: ["upload_complete", "cogs_saved", "manual_operation"],
};

export const ETL_JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;

export const ETL_JOB_STATUSES = [
  ETL_JOB_STATUS.QUEUED,
  ETL_JOB_STATUS.RUNNING,
  ETL_JOB_STATUS.SUCCEEDED,
  ETL_JOB_STATUS.FAILED,
] as const;

export type EtlJobStatus = (typeof ETL_JOB_STATUSES)[number];

export const ETL_ACTIVE_JOB_STATUSES = [ETL_JOB_STATUS.QUEUED, ETL_JOB_STATUS.RUNNING] as const;

export const ETL_TERMINAL_JOB_STATUSES = [
  ETL_JOB_STATUS.SUCCEEDED,
  ETL_JOB_STATUS.FAILED,
] as const;

export const ETL_JOB_STATUS_TRANSITIONS: Record<EtlJobStatus, readonly EtlJobStatus[]> = {
  [ETL_JOB_STATUS.QUEUED]: [ETL_JOB_STATUS.RUNNING, ETL_JOB_STATUS.FAILED],
  [ETL_JOB_STATUS.RUNNING]: [ETL_JOB_STATUS.SUCCEEDED, ETL_JOB_STATUS.FAILED],
  [ETL_JOB_STATUS.SUCCEEDED]: [],
  [ETL_JOB_STATUS.FAILED]: [],
};

export function isKnownEtlJobStatus(status: string): status is EtlJobStatus {
  return (ETL_JOB_STATUSES as readonly string[]).includes(status);
}

export const ETL_STAGE_ERROR_CODE = {
  STALE_QUEUED_OPERATION_TIMEOUT: "STALE_QUEUED_OPERATION_TIMEOUT",
  RUNNER_INVALID_OPERATION_SOURCE_FILE: "RUNNER_INVALID_OPERATION_SOURCE_FILE",
  RUNNER_REPLAY_REQUIRES_PIPELINE_RUN_ID: "RUNNER_REPLAY_REQUIRES_PIPELINE_RUN_ID",
  RUNNER_SOURCE_PIPELINE_RUN_NOT_FOUND: "RUNNER_SOURCE_PIPELINE_RUN_NOT_FOUND",
  RUNNER_OPERATION_EXECUTION_FAILED: "RUNNER_OPERATION_EXECUTION_FAILED",
  RUNNER_OPERATION_HANDLER_NOT_IMPLEMENTED: "RUNNER_OPERATION_HANDLER_NOT_IMPLEMENTED",
} as const;

export type EtlStageErrorCode = (typeof ETL_STAGE_ERROR_CODE)[keyof typeof ETL_STAGE_ERROR_CODE];

export const ETL_STAGE_ERROR_CLASSIFICATION: Record<
  EtlStageErrorCode,
  { retryable: boolean; stage: EtlPipelineStage | "orchestrator" }
> = {
  [ETL_STAGE_ERROR_CODE.STALE_QUEUED_OPERATION_TIMEOUT]: {
    retryable: true,
    stage: "orchestrator",
  },
  [ETL_STAGE_ERROR_CODE.RUNNER_INVALID_OPERATION_SOURCE_FILE]: {
    retryable: false,
    stage: "orchestrator",
  },
  [ETL_STAGE_ERROR_CODE.RUNNER_REPLAY_REQUIRES_PIPELINE_RUN_ID]: {
    retryable: false,
    stage: "matrix_materialization",
  },
  [ETL_STAGE_ERROR_CODE.RUNNER_SOURCE_PIPELINE_RUN_NOT_FOUND]: {
    retryable: true,
    stage: "matrix_materialization",
  },
  [ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_EXECUTION_FAILED]: {
    retryable: true,
    stage: "orchestrator",
  },
  [ETL_STAGE_ERROR_CODE.RUNNER_OPERATION_HANDLER_NOT_IMPLEMENTED]: {
    retryable: false,
    stage: "orchestrator",
  },
};

export function isRetryableEtlStageError(errorCode: EtlStageErrorCode): boolean {
  return ETL_STAGE_ERROR_CLASSIFICATION[errorCode].retryable;
}
