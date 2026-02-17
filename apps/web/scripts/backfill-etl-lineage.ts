import { prisma } from "@/lib/prisma/client";
import {
  buildLineageBackfillPayload,
  isStageLineageCompatEnabled,
  normalizeLegacyStatus,
} from "@/lib/etl/lineage-compat";

type BackfillMode = "dry-run" | "write";

function resolveMode(): BackfillMode {
  return process.env.ETL_LINEAGE_BACKFILL_WRITE === "1" ? "write" : "dry-run";
}

async function run() {
  if (!isStageLineageCompatEnabled()) {
    console.log("[lineage-backfill] skipped: ETL_STAGE_LINEAGE_COMPAT_ENABLED=0");
    return;
  }

  const mode = resolveMode();
  const jobs = await prisma.etlJob.findMany({
    where: {
      pipelineLineageRuns: {
        none: {},
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      locationId: true,
      analyticsId: true,
      pipelineRunId: true,
      status: true,
      sourceFile: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  console.log(`[lineage-backfill] mode=${mode} jobs_missing_lineage=${jobs.length}`);

  let createdRuns = 0;
  for (const job of jobs) {
    const payload = buildLineageBackfillPayload({
      id: job.id,
      status: job.status,
      sourceFile: job.sourceFile,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    });

    if (mode === "dry-run") {
      console.log(
        `[lineage-backfill] dry-run job=${job.id} status=${normalizeLegacyStatus(job.status)} stage=${payload.stage.stage}`,
      );
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const run = await tx.etlPipelineRun.create({
        data: {
          etlJobId: job.id,
          locationId: job.locationId,
          analyticsId: job.analyticsId,
          pipelineRunId: job.pipelineRunId,
          trigger: payload.run.trigger,
          source: payload.run.source,
          actor: payload.run.actor,
          status: payload.run.status,
          startedAt: payload.run.startedAt,
          finishedAt: payload.run.finishedAt,
          createdAt: job.createdAt,
        },
      });

      await tx.etlPipelineStageExecution.create({
        data: {
          runId: run.id,
          locationId: job.locationId,
          stage: payload.stage.stage,
          status: payload.stage.status,
          attempt: payload.stage.attempt,
          trigger: payload.stage.trigger,
          source: payload.stage.source,
          actor: payload.stage.actor,
          startedAt: payload.stage.startedAt,
          finishedAt: payload.stage.finishedAt,
          createdAt: job.createdAt,
        },
      });
    });
    createdRuns += 1;
  }

  console.log(`[lineage-backfill] completed mode=${mode} created_runs=${createdRuns}`);
}

run().catch((error) => {
  console.error("[lineage-backfill] failed:", error);
  process.exit(1);
});
