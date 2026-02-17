import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
  ETL_ACTIVE_JOB_STATUSES,
  ETL_JOB_STATUS,
  ETL_STAGE_ERROR_CODE,
} from "@/lib/etl/pipeline-contract";

type OperationAction = "retry" | "replay" | "backfill";

type OperationRequest = {
  action?: OperationAction;
  locationId?: number;
  pipelineRunId?: string;
  fromDate?: string;
  toDate?: string;
  reason?: string;
  idempotencyKey?: string;
};

const PIPELINE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STALE_QUEUE_ERROR = ETL_STAGE_ERROR_CODE.STALE_QUEUED_OPERATION_TIMEOUT;

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetweenInclusive(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function resolveBackfillMaxDays(): number {
  const parsed = Number(process.env.ETL_BACKFILL_MAX_DAYS ?? "31");
  if (!Number.isFinite(parsed) || parsed < 1) return 31;
  return Math.floor(parsed);
}

function resolveQueueStaleMinutes(): number {
  const parsed = Number(process.env.ETL_OPERATION_QUEUE_STALE_MINUTES ?? "30");
  if (!Number.isFinite(parsed) || parsed < 1) return 30;
  return Math.floor(parsed);
}

function buildOperationSourceFile(action: OperationAction, payload: Record<string, string>): string {
  const parts = Object.entries(payload)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${value}`);
  return `operation:${action}|${parts.join("|")}`.slice(0, 255);
}

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

function makeDeterministicIdempotencyKey(input: {
  action: OperationAction;
  locationId: number;
  pipelineRunId?: string;
  fromDate?: string;
  toDate?: string;
}): string {
  const normalized = JSON.stringify({
    action: input.action,
    locationId: input.locationId,
    pipelineRunId: input.pipelineRunId ?? null,
    fromDate: input.fromDate ?? null,
    toDate: input.toDate ?? null,
  });
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `op-${digest.slice(0, 32)}`;
}

async function findExistingByIdempotencyKey(idempotencyKey: string) {
  return prisma.etlJob.findUnique({
    where: { idempotencyKey },
    select: {
      id: true,
      status: true,
      locationId: true,
      sourceFile: true,
      pipelineRunId: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
      errorMessage: true,
    },
  });
}

async function hasActiveOperationConflict(locationId: number): Promise<boolean> {
  const active = await prisma.etlJob.findFirst({
    where: {
      locationId,
      status: { in: [...ETL_ACTIVE_JOB_STATUSES] },
      sourceFile: { startsWith: "operation:" },
    },
    select: { id: true },
  });
  return Boolean(active);
}

async function resolveStaleQueuedOperations(locationId: number): Promise<number> {
  const staleMinutes = resolveQueueStaleMinutes();
  const cutoff = new Date(Date.now() - staleMinutes * 60_000);
  const result = await prisma.etlJob.updateMany({
    where: {
      locationId,
      status: ETL_JOB_STATUS.QUEUED,
      sourceFile: { startsWith: "operation:" },
      createdAt: { lt: cutoff },
    },
    data: {
      status: ETL_JOB_STATUS.FAILED,
      errorMessage: `${STALE_QUEUE_ERROR}:${staleMinutes}m`,
      finishedAt: new Date(),
    },
  });
  return result.count;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationIdParam = url.searchParams.get("locationId");
    const status = url.searchParams.get("status");
    const actionParam = url.searchParams.get("action");
    const limitParam = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isInteger(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 50;

    const locationId =
      locationIdParam == null || locationIdParam === "" ? null : Number(locationIdParam);
    if (locationId != null && !Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const action =
      actionParam == null || actionParam === ""
        ? null
        : actionParam === "retry" || actionParam === "replay" || actionParam === "backfill"
          ? actionParam
          : null;
    if (actionParam && !action) {
      return NextResponse.json(
        { error: "INVALID_ACTION", expected: ["retry", "replay", "backfill"] },
        { status: 400 },
      );
    }

    const jobs = await prisma.etlJob.findMany({
      where: {
        ...(locationId != null ? { locationId } : {}),
        ...(status ? { status } : {}),
        sourceFile: {
          startsWith: "operation:",
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        locationId: true,
        sourceFile: true,
        pipelineRunId: true,
        idempotencyKey: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        updatedAt: true,
        errorMessage: true,
      },
    });

    const operations = jobs
      .map((job) => {
        const parsed = parseOperationSourceFile(job.sourceFile);
        if (!parsed.isOperation || !parsed.action) return null;
        return {
          id: job.id,
          action: parsed.action,
          status: job.status,
          locationId: job.locationId,
          pipelineRunId: job.pipelineRunId,
          idempotencyKey: job.idempotencyKey,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
          updatedAt: job.updatedAt,
          errorMessage: job.errorMessage,
          meta: parsed.meta,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => (action ? item.action === action : true));

    return NextResponse.json({ operations }, { status: 200 });
  } catch (error) {
    console.error("List ETL operations error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OperationRequest;
    const action = body.action;
    const locationId = Number(body.locationId);

    if (action !== "retry" && action !== "replay" && action !== "backfill") {
      return NextResponse.json(
        { error: "INVALID_ACTION", expected: ["retry", "replay", "backfill"] },
        { status: 400 },
      );
    }

    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json({ error: "LOCATION_NOT_FOUND" }, { status: 404 });
    }

    const pipelineRunId = body.pipelineRunId?.trim() ?? "";
    const fromDateRaw = body.fromDate?.trim() ?? "";
    const toDateRaw = body.toDate?.trim() ?? "";

    if ((action === "retry" || action === "replay") && !PIPELINE_UUID_RE.test(pipelineRunId)) {
      return NextResponse.json(
        { error: "INVALID_PIPELINE_RUN_ID", message: "retry/replay requires valid pipelineRunId" },
        { status: 400 },
      );
    }

    if (action === "backfill") {
      const fromDate = parseDate(fromDateRaw);
      const toDate = parseDate(toDateRaw);
      if (!fromDate || !toDate) {
        return NextResponse.json(
          { error: "INVALID_DATE_RANGE", message: "backfill requires valid fromDate and toDate" },
          { status: 400 },
        );
      }
      if (fromDate > toDate) {
        return NextResponse.json({ error: "INVALID_DATE_RANGE_ORDER" }, { status: 400 });
      }
      const rangeDays = daysBetweenInclusive(fromDate, toDate);
      const maxDays = resolveBackfillMaxDays();
      if (rangeDays > maxDays) {
        return NextResponse.json(
          { error: "BACKFILL_RANGE_TOO_LARGE", maxDays },
          { status: 400 },
        );
      }
    }

    const suppliedIdempotencyKey = body.idempotencyKey?.trim() ?? "";
    const idempotencyKey =
      suppliedIdempotencyKey.length > 0
        ? suppliedIdempotencyKey.slice(0, 128)
        : makeDeterministicIdempotencyKey({
            action,
            locationId,
            pipelineRunId: pipelineRunId || undefined,
            fromDate: fromDateRaw || undefined,
            toDate: toDateRaw || undefined,
          });

    const existing = await findExistingByIdempotencyKey(idempotencyKey);
    if (existing) {
      const parsed = parseOperationSourceFile(existing.sourceFile);
      return NextResponse.json(
        {
          operation: {
            id: existing.id,
            action: parsed.action,
            status: existing.status,
            locationId: existing.locationId,
            pipelineRunId: existing.pipelineRunId,
            idempotencyKey,
            createdAt: existing.createdAt,
            startedAt: existing.startedAt,
            finishedAt: existing.finishedAt,
            updatedAt: existing.updatedAt,
            errorMessage: existing.errorMessage,
            meta: parsed.meta,
          },
          deduped: true,
        },
        { status: 200 },
      );
    }

    const sourceJob = pipelineRunId
      ? await prisma.etlJob.findFirst({
          where: {
            pipelineRunId,
            locationId,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            analyticsId: true,
          },
        })
      : null;

    if (pipelineRunId && !sourceJob) {
      return NextResponse.json(
        { error: "SOURCE_PIPELINE_RUN_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (action === "retry" && sourceJob && sourceJob.status !== ETL_JOB_STATUS.FAILED) {
      return NextResponse.json(
        { error: "RETRY_REQUIRES_FAILED_SOURCE_RUN" },
        { status: 409 },
      );
    }

    const staleResolvedCount = await resolveStaleQueuedOperations(locationId);
    const hasConflict = await hasActiveOperationConflict(locationId);
    if (hasConflict) {
      return NextResponse.json(
        {
          error: "OPERATION_CONFLICT_ACTIVE_RUN",
          message:
            staleResolvedCount > 0
              ? `Resolved ${staleResolvedCount} stale queued operation(s), but another active operation is still queued/running for this location.`
              : "Another retry/replay/backfill operation is already queued or running for this location.",
        },
        { status: 409 },
      );
    }

    const analyticsId = sourceJob?.analyticsId ?? null;

    const sourceFile = buildOperationSourceFile(action, {
      pipelineRunId,
      fromDate: fromDateRaw,
      toDate: toDateRaw,
      requestedAt: new Date().toISOString(),
      requestId: randomUUID().slice(0, 8),
    });

    const job = await prisma.etlJob.create({
      data: {
        locationId,
        analyticsId,
        sourceFile,
        fileHash: null,
        idempotencyKey,
        status: ETL_JOB_STATUS.QUEUED,
        errorMessage: body.reason?.slice(0, 500) ?? null,
        pipelineRunId: pipelineRunId || null,
      },
      select: {
        id: true,
        status: true,
        locationId: true,
        sourceFile: true,
        pipelineRunId: true,
        idempotencyKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const parsed = parseOperationSourceFile(job.sourceFile);
    return NextResponse.json(
      {
        operation: {
          id: job.id,
          action: parsed.action,
          status: job.status,
          locationId: job.locationId,
          pipelineRunId: job.pipelineRunId,
          idempotencyKey: job.idempotencyKey,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          meta: parsed.meta,
        },
        deduped: false,
      },
      { status: 201 },
    );
  } catch (error) {
    const maybe = error as { code?: string };
    if (maybe?.code === "P2002") {
      return NextResponse.json(
        { error: "IDEMPOTENCY_KEY_CONFLICT" },
        { status: 409 },
      );
    }
    console.error("Create ETL operation error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
