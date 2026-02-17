import { NextResponse } from "next/server";
import { executeMatrixMaterializationStageJob } from "@/lib/etl/stage-handlers/matrix-materialization";
import {
  runQueuedStageJobs,
  resolveStaleQueuedStageJobs,
  resolveStaleRunningStageJobs,
} from "@/lib/etl/stage-runner";

function resolveQueueStaleMinutes(): number {
  const parsed = Number(process.env.ETL_OPERATION_QUEUE_STALE_MINUTES ?? "30");
  if (!Number.isFinite(parsed) || parsed < 1) return 30;
  return Math.floor(parsed);
}

function resolveRunningStaleMinutes(): number {
  const parsed = Number(
    process.env.ETL_OPERATION_RUNNING_STALE_MINUTES ??
      process.env.ETL_OPERATION_QUEUE_STALE_MINUTES ??
      "60",
  );
  if (!Number.isFinite(parsed) || parsed < 1) return 60;
  return Math.floor(parsed);
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

    const staleResolvedCount = await resolveStaleQueuedStageJobs({
      stage: "matrix_materialization",
      sourcePrefix: "operation:",
      locationId,
      staleMinutes: resolveQueueStaleMinutes(),
    });
    const staleRunningResolvedCount = await resolveStaleRunningStageJobs({
      stage: "matrix_materialization",
      sourcePrefix: "operation:",
      locationId,
      staleMinutes: resolveRunningStaleMinutes(),
    });

    const { processed } = await runQueuedStageJobs({
      stage: "matrix_materialization",
      sourcePrefix: "operation:",
      locationId,
      limit,
      execute: executeMatrixMaterializationStageJob,
    });

    return NextResponse.json(
      {
        staleResolvedCount,
        staleRunningResolvedCount,
        processedCount: processed.length,
        processed: processed.map((item) => ({
          id: item.id,
          action:
            typeof item.result.meta === "object" &&
            item.result.meta !== null &&
            "action" in item.result.meta
              ? String((item.result.meta as { action?: unknown }).action ?? "unknown")
              : "unknown",
          status: item.result.status,
          ...(item.result.errorMessage ? { error: item.result.errorMessage } : {}),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Run ETL operations queue error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
