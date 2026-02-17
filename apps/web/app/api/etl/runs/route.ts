import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { ETL_JOB_STATUSES } from "@/lib/etl/pipeline-contract";
import {
  buildQualityHints,
  buildRunCursor,
  computeDurationMs,
  isKnownRunStatus,
  normalizeRunStatusFilter,
  parseRunCursor,
  summarizeError,
  toRunSourceKind,
  type EtlRunsListResponse,
} from "@/lib/etl/run-history";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const PIPELINE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseInteger(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  return value;
}

function parseDate(raw: string | null, endOfDay: boolean): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const value = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T00:00:00.000Z`)
    : new Date(trimmed);
  if (Number.isNaN(value.getTime())) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    value.setUTCHours(23, 59, 59, 999);
  }
  return value;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const locationIdRaw = url.searchParams.get("locationId");
    const locationId =
      locationIdRaw == null || locationIdRaw === "" ? null : parseInteger(locationIdRaw);
    if (locationIdRaw && locationId == null) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const statusParams = url.searchParams.getAll("status");
    const statuses = normalizeRunStatusFilter(statusParams);
    if (statuses.some((status) => !isKnownRunStatus(status))) {
      return NextResponse.json(
        { error: "INVALID_STATUS", expected: ETL_JOB_STATUSES },
        { status: 400 },
      );
    }

    const fromDateRaw = url.searchParams.get("fromDate");
    const toDateRaw = url.searchParams.get("toDate");
    const fromDate = parseDate(fromDateRaw, false);
    const toDate = parseDate(toDateRaw, true);
    if (fromDateRaw && !fromDate) {
      return NextResponse.json({ error: "INVALID_FROM_DATE" }, { status: 400 });
    }
    if (toDateRaw && !toDate) {
      return NextResponse.json({ error: "INVALID_TO_DATE" }, { status: 400 });
    }
    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json({ error: "INVALID_DATE_RANGE_ORDER" }, { status: 400 });
    }

    const cursorRaw = url.searchParams.get("cursor");
    const cursor = cursorRaw ? parseRunCursor(cursorRaw) : null;
    if (cursorRaw && !cursor) {
      return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400 });
    }

    const limitRaw = parseInteger(url.searchParams.get("limit"));
    if (url.searchParams.get("limit") && limitRaw == null) {
      return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
    }
    const limit = limitRaw == null ? DEFAULT_LIMIT : Math.max(1, Math.min(limitRaw, MAX_LIMIT));

    const searchRaw = (url.searchParams.get("search") ?? "").trim();
    const search = searchRaw.length > 0 ? searchRaw.slice(0, 120) : null;

    const andFilters: Prisma.EtlJobWhereInput[] = [];
    if (search) {
      const searchFilters: Prisma.EtlJobWhereInput[] = [
        { sourceFile: { contains: search, mode: "insensitive" } },
      ];
      if (PIPELINE_UUID_RE.test(search)) {
        searchFilters.push({ pipelineRunId: search.toLowerCase() });
      }
      andFilters.push({ OR: searchFilters });
    }
    if (cursor) {
      andFilters.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          {
            AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
          },
        ],
      });
    }

    const runs = await prisma.etlJob.findMany({
      where: {
        ...(locationId == null ? {} : { locationId }),
        ...(statuses.length === 0 ? {} : { status: { in: statuses } }),
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        ...(andFilters.length > 0 ? { AND: andFilters } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        locationId: true,
        analyticsId: true,
        status: true,
        sourceFile: true,
        pipelineRunId: true,
        idempotencyKey: true,
        errorMessage: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
      },
    });

    const hasMore = runs.length > limit;
    const pageRuns = hasMore ? runs.slice(0, limit) : runs;
    const lastRun = pageRuns.length > 0 ? pageRuns[pageRuns.length - 1] : null;
    const nextCursor = hasMore && lastRun ? buildRunCursor(lastRun.createdAt, lastRun.id) : null;

    const response: EtlRunsListResponse = {
      runs: pageRuns.map((run) => ({
        id: run.id,
        status: run.status,
        locationId: run.locationId,
        analyticsId: run.analyticsId,
        pipelineRunId: run.pipelineRunId,
        sourceFile: run.sourceFile,
        sourceKind: toRunSourceKind(run.sourceFile),
        idempotencyKey: run.idempotencyKey,
        createdAt: run.createdAt.toISOString(),
        startedAt: run.startedAt?.toISOString() ?? null,
        finishedAt: run.finishedAt?.toISOString() ?? null,
        durationMs: computeDurationMs(run.startedAt, run.finishedAt),
        errorMessage: run.errorMessage,
        errorSummary: summarizeError(run.errorMessage),
        qualityHints: buildQualityHints({
          sourceFile: run.sourceFile,
          pipelineRunId: run.pipelineRunId,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
        }),
      })),
      page: {
        limit,
        hasMore,
        nextCursor,
      },
      filters: {
        locationId,
        statuses,
        fromDate: fromDate?.toISOString() ?? null,
        toDate: toDate?.toISOString() ?? null,
        search,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("List ETL runs error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
