import { createHash } from "node:crypto";

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function buildUploadStageIdempotencyKey(input: {
  locationId: number;
  fileHash: string;
}): string {
  return sha256(`upload:${input.locationId}:${input.fileHash}`);
}

export function buildCogsVersionHash(
  updates: Array<{ id: number; cogs: number | null }>,
): string {
  const normalized = updates
    .map((item) => ({
      id: Number(item.id),
      cogs: item.cogs == null ? null : Number(item.cogs),
    }))
    .sort((a, b) => a.id - b.id);
  return sha256(JSON.stringify(normalized));
}

export function buildCogsStageIdempotencyKey(input: {
  analyticsId: number;
  pipelineRunId: string | null;
  cogsVersionHash: string;
}): string {
  return sha256(
    JSON.stringify({
      stage: "cogs_enrichment",
      analyticsId: input.analyticsId,
      pipelineRunId: input.pipelineRunId,
      cogsVersionHash: input.cogsVersionHash,
    }),
  );
}

export function buildMatrixStageIdempotencyKey(input: {
  locationId: number;
  pipelineRunId?: string;
  cogsVersionHash?: string;
  fromDate?: string;
  toDate?: string;
  action: "retry" | "replay" | "backfill";
}): string {
  return sha256(
    JSON.stringify({
      stage: "matrix_materialization",
      locationId: input.locationId,
      pipelineRunId: input.pipelineRunId ?? null,
      cogsVersionHash: input.cogsVersionHash ?? null,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      action: input.action,
    }),
  );
}
