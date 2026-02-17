import type { EtlJobStatus } from "@/lib/etl/pipeline-contract";

export type LegacyEtlJobLike = {
  id: string;
  status: string;
  sourceFile: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export function isStageLineageCompatEnabled(): boolean {
  return process.env.ETL_STAGE_LINEAGE_COMPAT_ENABLED !== "0";
}

export function resolveLegacyStageFromSource(sourceFile: string | null): string {
  if (!sourceFile) return "upload_ingest";
  if (sourceFile.startsWith("cogs_enrichment:")) return "cogs_enrichment";
  if (sourceFile.startsWith("operation:")) return "matrix_materialization";
  return "upload_ingest";
}

export function resolveLegacyTriggerFromSource(sourceFile: string | null): string {
  if (!sourceFile) return "upload_complete";
  if (sourceFile.startsWith("cogs_enrichment:")) return "cogs_saved";
  if (sourceFile.startsWith("operation:")) return "manual_operation";
  return "upload_complete";
}

export function normalizeLegacyStatus(status: string): EtlJobStatus {
  if (status === "queued" || status === "running" || status === "succeeded" || status === "failed") {
    return status;
  }
  return "failed";
}

export function buildLineageBackfillPayload(job: LegacyEtlJobLike) {
  const stage = resolveLegacyStageFromSource(job.sourceFile);
  const trigger = resolveLegacyTriggerFromSource(job.sourceFile);
  const status = normalizeLegacyStatus(job.status);
  return {
    run: {
      status,
      trigger,
      source: "legacy_backfill",
      actor: "script:backfill_etl_lineage",
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    },
    stage: {
      stage,
      status,
      attempt: 1,
      trigger,
      source: "legacy_backfill",
      actor: "script:backfill_etl_lineage",
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    },
  };
}
