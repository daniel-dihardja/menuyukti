import {
  ETL_JOB_STATUS,
  ETL_JOB_STATUSES,
  isKnownEtlJobStatus,
  type EtlJobStatus,
} from "@/lib/etl/pipeline-contract";

export const ETL_RUN_STATUSES = ETL_JOB_STATUSES;

export type EtlRunStatus = EtlJobStatus;

export type EtlRunQualityHint =
  | "operation_trigger"
  | "missing_pipeline_run_id"
  | "pending_start"
  | "missing_finish_time"
  | "failure_needs_recovery";

export type EtlRunRecord = {
  id: string;
  status: EtlRunStatus | string;
  locationId: number;
  analyticsId: number | null;
  pipelineRunId: string | null;
  sourceFile: string | null;
  sourceKind: "operation" | "ingestion" | "unknown";
  idempotencyKey: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  errorSummary: string | null;
  qualityHints: EtlRunQualityHint[];
};

export type EtlRunsListResponse = {
  runs: EtlRunRecord[];
  page: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  filters: {
    locationId: number | null;
    statuses: string[];
    fromDate: string | null;
    toDate: string | null;
    search: string | null;
  };
};

export function buildRunCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

export function parseRunCursor(raw: string): { createdAt: Date; id: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const [createdAtRaw, ...idParts] = trimmed.split("|");
  const id = idParts.join("|").trim();
  if (!createdAtRaw || !id) return null;
  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

export function normalizeRunStatusFilter(rawValues: string[]): string[] {
  const statuses = rawValues
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(statuses));
}

export function isKnownRunStatus(status: string): status is EtlRunStatus {
  return isKnownEtlJobStatus(status);
}

export function toRunSourceKind(sourceFile: string | null): "operation" | "ingestion" | "unknown" {
  if (!sourceFile) return "unknown";
  if (sourceFile.startsWith("operation:")) return "operation";
  return "ingestion";
}

export function summarizeError(errorMessage: string | null): string | null {
  if (!errorMessage) return null;
  const firstLine = errorMessage.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  if (!firstLine) return null;
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

export function computeDurationMs(startedAt: Date | null, finishedAt: Date | null): number | null {
  if (!startedAt || !finishedAt) return null;
  const ms = finishedAt.getTime() - startedAt.getTime();
  return ms >= 0 ? ms : null;
}

export function buildQualityHints(input: {
  sourceFile: string | null;
  pipelineRunId: string | null;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
}): EtlRunQualityHint[] {
  const hints: EtlRunQualityHint[] = [];
  if (input.sourceFile?.startsWith("operation:")) hints.push("operation_trigger");
  if (!input.pipelineRunId) hints.push("missing_pipeline_run_id");
  if (
    (input.status === ETL_JOB_STATUS.QUEUED || input.status === ETL_JOB_STATUS.RUNNING) &&
    !input.startedAt
  ) {
    hints.push("pending_start");
  }
  if (input.status === ETL_JOB_STATUS.RUNNING && !input.finishedAt) {
    hints.push("missing_finish_time");
  }
  if (input.status === ETL_JOB_STATUS.FAILED) {
    hints.push("failure_needs_recovery");
  }
  return hints;
}
