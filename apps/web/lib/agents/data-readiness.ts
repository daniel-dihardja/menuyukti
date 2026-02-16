import { prisma } from "@/lib/prisma/client";

export type AgentDataReadinessLevel = "ready" | "warn" | "blocked";

export type AgentDataReadiness = {
  level: AgentDataReadinessLevel;
  reasonCode:
    | "READY"
    | "MISSING_PIPELINE_RUN"
    | "QUALITY_FAILED"
    | "QUALITY_WARN"
    | "DATA_STALE";
  message: string;
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  freshnessSlaMinutes: number;
  pipelineRunId: string | null;
  ingestedAtUtc: string | null;
};

export async function evaluateAgentDataReadiness(
  analyticsId: number,
): Promise<AgentDataReadiness> {
  const freshnessSlaMinutes = Number(
    process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440",
  );

  const etlJob = await prisma.etlJob.findFirst({
    where: {
      analyticsId,
      status: "succeeded",
      pipelineRunId: { not: null },
    },
    orderBy: { finishedAt: "desc" },
    select: { pipelineRunId: true },
  });

  if (!etlJob?.pipelineRunId) {
    return {
      level: "blocked",
      reasonCode: "MISSING_PIPELINE_RUN",
      message: "No successful pipeline run metadata found for this analytics snapshot.",
      qualityStatus: null,
      freshnessMinutes: null,
      freshnessSlaMinutes,
      pipelineRunId: null,
      ingestedAtUtc: null,
    };
  }

  const runRows = await prisma.$queryRaw<
    Array<{ ingested_at_utc: Date; quality_status: string }>
  >`
    SELECT ingested_at_utc, quality_status
    FROM warehouse.dim_pipeline_run
    WHERE pipeline_run_id = CAST(${etlJob.pipelineRunId} AS UUID)
    LIMIT 1
  `;

  const run = runRows[0];
  if (!run) {
    return {
      level: "blocked",
      reasonCode: "MISSING_PIPELINE_RUN",
      message: "Pipeline run record is missing in warehouse metadata.",
      qualityStatus: null,
      freshnessMinutes: null,
      freshnessSlaMinutes,
      pipelineRunId: etlJob.pipelineRunId,
      ingestedAtUtc: null,
    };
  }

  const qualityStatus = String(run.quality_status ?? "").toLowerCase();
  const freshnessMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(run.ingested_at_utc).getTime()) / 60_000),
  );

  if (qualityStatus === "failed") {
    return {
      level: "blocked",
      reasonCode: "QUALITY_FAILED",
      message: "Pipeline quality status is failed. Agent output is blocked.",
      qualityStatus,
      freshnessMinutes,
      freshnessSlaMinutes,
      pipelineRunId: etlJob.pipelineRunId,
      ingestedAtUtc: new Date(run.ingested_at_utc).toISOString(),
    };
  }

  if (qualityStatus === "warn") {
    return {
      level: "warn",
      reasonCode: "QUALITY_WARN",
      message: "Pipeline quality status is warn. Agent output is downgraded.",
      qualityStatus,
      freshnessMinutes,
      freshnessSlaMinutes,
      pipelineRunId: etlJob.pipelineRunId,
      ingestedAtUtc: new Date(run.ingested_at_utc).toISOString(),
    };
  }

  if (freshnessMinutes > freshnessSlaMinutes) {
    return {
      level: "warn",
      reasonCode: "DATA_STALE",
      message: "Data freshness SLA exceeded. Agent output is downgraded.",
      qualityStatus,
      freshnessMinutes,
      freshnessSlaMinutes,
      pipelineRunId: etlJob.pipelineRunId,
      ingestedAtUtc: new Date(run.ingested_at_utc).toISOString(),
    };
  }

  return {
    level: "ready",
    reasonCode: "READY",
    message: "Data readiness checks passed.",
    qualityStatus,
    freshnessMinutes,
    freshnessSlaMinutes,
    pipelineRunId: etlJob.pipelineRunId,
    ingestedAtUtc: new Date(run.ingested_at_utc).toISOString(),
  };
}
