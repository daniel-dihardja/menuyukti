import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import type {
  UpdateInstagramWeeklyScheduleRequest,
  UpsertInstagramWeeklyScheduleRequest,
} from "@/app/api/instagram/types";
import {
  createDecisionApiContract,
  createDecisionContext,
  mapSchedulerGuardrailToTrust,
} from "@/lib/contracts/decision-api-contract";

function hasSchedulerDelegates(): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return Boolean(client.instagramWeeklySchedule) && Boolean(client.instagramWeeklyScheduleEntry);
}

function isMissingSchedulerStorageError(error: unknown): boolean {
  const maybe = error as {
    code?: string;
    meta?: { code?: string; message?: string };
    message?: string;
  };

  const message = String(maybe?.meta?.message ?? maybe?.message ?? "");
  const isPrismaRawQueryError = maybe?.code === "P2010";
  const isMissingRelationCode = maybe?.meta?.code === "42P01";
  const referencesSchedulerTable =
    message.includes("instagram_weekly_schedules") ||
    message.includes("instagram_weekly_schedule_entries");

  return (isPrismaRawQueryError && isMissingRelationCode) || referencesSchedulerTable;
}

type SchedulerStorageReadiness = {
  delegateReady: boolean;
  tablesReady: boolean;
};

async function getSchedulerStorageReadiness(): Promise<SchedulerStorageReadiness> {
  const delegateReady = hasSchedulerDelegates();
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        schedules: string | null;
        entries: string | null;
      }>
    >`
      SELECT
        to_regclass('public.instagram_weekly_schedules')::text AS schedules,
        to_regclass('public.instagram_weekly_schedule_entries')::text AS entries
    `;

    const result = rows[0];
    return {
      delegateReady,
      tablesReady: Boolean(result?.schedules) && Boolean(result?.entries),
    };
  } catch (error) {
    if (isMissingSchedulerStorageError(error)) {
      return {
        delegateReady,
        tablesReady: false,
      };
    }
    throw error;
  }
}

function schedulerStorageNotReadyResponse(readiness: SchedulerStorageReadiness) {
  const context = createDecisionContext({
    persona: "marketer",
    trust: {
      qualityStatus: "failed",
      reasons: ["scheduler_storage_not_ready"],
    },
  });
  return NextResponse.json(
    {
      error: "SCHEDULER_STORAGE_NOT_READY",
      message:
        "Instagram weekly scheduler tables or Prisma delegates are not available. Run database migrations and Prisma generate before using scheduler save APIs.",
      readiness,
      actions: ["pnpm -C apps/web run db:init", "pnpm -C apps/web run db:gen"],
      contract: createDecisionApiContract({
        surface: "scheduler",
        context,
        readiness: "blocked",
        confidence: "blocked",
      }),
    },
    { status: 503 },
  );
}

function normalizeMenuName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeWeekRange(weekStartDateRaw: string, weekEndDateRaw?: string): { weekStartDate: Date; weekEndDate: Date } | null {
  const weekStartDate = parseDate(weekStartDateRaw);
  if (!weekStartDate) return null;

  if (weekEndDateRaw) {
    const weekEndDate = parseDate(weekEndDateRaw);
    if (!weekEndDate) return null;
    return { weekStartDate, weekEndDate };
  }

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
  return { weekStartDate, weekEndDate };
}

function normalizeScheduleStatus(
  value: unknown,
): "draft" | "scheduled" | "finalized" | "cancelled" | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === "draft" || raw === "scheduled" || raw === "finalized" || raw === "cancelled") {
    return raw;
  }
  return undefined;
}

type NormalizedEntry = {
  id?: number;
  instagramCampaignId: number | null;
  instagramPostId: number | null;
  canonicalMenuName: string;
  canonicalMenuNameNorm: string;
  scheduledFor: Date;
  daypart: string | null;
  confidence: "high" | "medium" | "low" | "blocked";
  rationale: string | null;
  status: "draft" | "scheduled" | "published" | "cancelled";
};

type SchedulingGuardrail = {
  readiness: "ready" | "degraded" | "blocked";
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  isStale: boolean;
  reasons: string[];
  actions: string[];
};

function createSchedulerContract(input: {
  locationId?: number | null;
  filterState?: Record<string, unknown>;
  guardrail?: SchedulingGuardrail | null;
  evidenceMetric?: string;
  evidenceValue?: string | number | boolean | null;
} = {}) {
  const trust = input.guardrail
    ? mapSchedulerGuardrailToTrust(input.guardrail)
    : {
        qualityStatus: "unknown" as const,
        freshnessMinutes: null,
        isStale: false,
        reasons: ["guardrail_not_loaded"],
      };

  const context = createDecisionContext({
    persona: "marketer",
    locationId: input.locationId ?? null,
    filterState: input.filterState ?? {},
    trust,
    lineage: {
      sourceSystem: "warehouse",
    },
  });

  return createDecisionApiContract({
    surface: "scheduler",
    context,
    evidence:
      input.evidenceMetric === undefined
        ? []
        : [
            {
              source: "derived_runtime",
              entity: "public.instagram_weekly_schedules",
              metric: input.evidenceMetric,
              value: input.evidenceValue ?? null,
              key: { locationId: input.locationId ?? null },
              note: "scheduler workflow guardrail context",
            },
          ],
  });
}

function normalizeEntries(entriesRaw: unknown): { entries: NormalizedEntry[]; invalid: boolean } {
  const entriesInput = Array.isArray(entriesRaw) ? entriesRaw : [];

  const normalized: NormalizedEntry[] = [];
  const seen = new Set<string>();

  for (const entryRaw of entriesInput) {
    const entry = entryRaw as Record<string, unknown>;

    const canonicalMenuName = String(entry.canonicalMenuName ?? "").trim();
    if (!canonicalMenuName) continue;

    const canonicalMenuNameNorm = normalizeMenuName(canonicalMenuName);
    const scheduledForRaw = String(entry.scheduledFor ?? "");
    const scheduledFor = parseDate(scheduledForRaw);
    if (!scheduledFor) return { entries: [], invalid: true };

    const idValue = entry.id == null ? undefined : Number(entry.id);
    if (idValue !== undefined && !Number.isInteger(idValue)) return { entries: [], invalid: true };

    const instagramCampaignIdRaw = entry.instagramCampaignId == null ? null : Number(entry.instagramCampaignId);
    if (instagramCampaignIdRaw != null && !Number.isInteger(instagramCampaignIdRaw)) return { entries: [], invalid: true };

    const instagramPostIdRaw = entry.instagramPostId == null ? null : Number(entry.instagramPostId);
    if (instagramPostIdRaw != null && !Number.isInteger(instagramPostIdRaw)) return { entries: [], invalid: true };

    const confidenceRaw = String(entry.confidence ?? "medium");
    const confidence =
      confidenceRaw === "high" || confidenceRaw === "low" || confidenceRaw === "blocked" ? confidenceRaw : "medium";

    const statusRaw = String(entry.status ?? "draft");
    const status =
      statusRaw === "scheduled" || statusRaw === "published" || statusRaw === "cancelled" ? statusRaw : "draft";

    const daypart = entry.daypart == null ? null : String(entry.daypart).trim() || null;
    const rationale = entry.rationale == null ? null : String(entry.rationale).trim() || null;

    const dedupeKey = `${canonicalMenuNameNorm}|${scheduledFor.toISOString()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({
      id: idValue,
      instagramCampaignId: instagramCampaignIdRaw,
      instagramPostId: instagramPostIdRaw,
      canonicalMenuName,
      canonicalMenuNameNorm,
      scheduledFor,
      daypart,
      confidence,
      rationale,
      status,
    });
  }

  return { entries: normalized, invalid: false };
}

async function getSchedulingGuardrail(locationId: number): Promise<SchedulingGuardrail> {
  const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
  const latestSuccessfulJob = await prisma.etlJob.findFirst({
    where: {
      locationId,
      status: "succeeded",
      pipelineRunId: { not: null },
    },
    orderBy: { finishedAt: "desc" },
    select: { pipelineRunId: true },
  });

  if (!latestSuccessfulJob?.pipelineRunId) {
    return {
      readiness: "degraded",
      qualityStatus: null,
      freshnessMinutes: null,
      isStale: false,
      reasons: ["missing_pipeline_run"],
      actions: ["downgrade_confidence"],
    };
  }

  const runRows = await prisma.$queryRaw<Array<{ ingested_at_utc: Date; quality_status: string }>>`
    SELECT ingested_at_utc, quality_status
    FROM warehouse.dim_pipeline_run
    WHERE pipeline_run_id = CAST(${latestSuccessfulJob.pipelineRunId} AS UUID)
    LIMIT 1
  `;

  const run = runRows[0];
  if (!run) {
    return {
      readiness: "degraded",
      qualityStatus: null,
      freshnessMinutes: null,
      isStale: false,
      reasons: ["missing_pipeline_metadata"],
      actions: ["downgrade_confidence"],
    };
  }

  const freshnessMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(run.ingested_at_utc).getTime()) / 60_000),
  );
  const isStale = freshnessMinutes > freshnessSlaMinutes;
  const qualityStatus = String(run.quality_status ?? "").toLowerCase() || null;

  if (qualityStatus === "failed") {
    return {
      readiness: "blocked",
      qualityStatus,
      freshnessMinutes,
      isStale,
      reasons: ["quality_failed"],
      actions: ["block_generation", "set_confidence_blocked"],
    };
  }

  if (qualityStatus === "warn" || isStale) {
    const reasons: string[] = [];
    if (qualityStatus === "warn") reasons.push("quality_warn");
    if (isStale) reasons.push("freshness_stale");

    return {
      readiness: "degraded",
      qualityStatus,
      freshnessMinutes,
      isStale,
      reasons,
      actions: ["downgrade_confidence"],
    };
  }

  return {
    readiness: "ready",
    qualityStatus,
    freshnessMinutes,
    isStale,
    reasons: [],
    actions: [],
  };
}

function applyEntryGuardrails(entries: NormalizedEntry[], guardrail: SchedulingGuardrail): NormalizedEntry[] {
  return entries.map((entry) => {
    const fallbackRationale = `Scheduled with ${entry.daypart ?? "daypart"} slot from deterministic recommendation workflow.`;
    let confidence = entry.confidence;

    if (guardrail.readiness === "blocked") {
      confidence = "blocked";
    } else if (guardrail.readiness === "degraded" && confidence === "high") {
      confidence = "medium";
    }

    return {
      ...entry,
      confidence,
      rationale: entry.rationale ?? fallbackRationale,
    };
  });
}

async function validateReferenceOwnership(locationId: number, entries: NormalizedEntry[]): Promise<boolean> {
  const campaignIds = Array.from(
    new Set(entries.map((entry) => entry.instagramCampaignId).filter((id): id is number => id != null)),
  );
  const postIds = Array.from(
    new Set(entries.map((entry) => entry.instagramPostId).filter((id): id is number => id != null)),
  );

  if (campaignIds.length > 0) {
    const campaigns = await prisma.instagramCampaign.findMany({
      where: {
        id: { in: campaignIds },
      },
      select: { id: true, locationId: true },
    });
    if (campaigns.length !== campaignIds.length) return false;
    if (campaigns.some((campaign) => campaign.locationId !== locationId)) return false;
  }

  if (postIds.length > 0) {
    const posts = await prisma.instagramPost.findMany({
      where: {
        id: { in: postIds },
      },
      select: { id: true, locationId: true },
    });
    if (posts.length !== postIds.length) return false;
    if (posts.some((post) => post.locationId !== locationId)) return false;
  }

  return true;
}

async function persistEntries(
  scheduleId: number,
  locationId: number,
  entries: NormalizedEntry[],
  replaceEntries: boolean,
) {
  if (replaceEntries) {
    await prisma.instagramWeeklyScheduleEntry.deleteMany({
      where: { scheduleId },
    });
  }

  for (const entry of entries) {
    if (entry.id != null && !replaceEntries) {
      const updated = await prisma.instagramWeeklyScheduleEntry.updateMany({
        where: {
          id: entry.id,
          scheduleId,
          locationId,
        },
        data: {
          instagramCampaignId: entry.instagramCampaignId,
          instagramPostId: entry.instagramPostId,
          canonicalMenuName: entry.canonicalMenuName,
          canonicalMenuNameNorm: entry.canonicalMenuNameNorm,
          scheduledFor: entry.scheduledFor,
          daypart: entry.daypart,
          confidence: entry.confidence,
          rationale: entry.rationale,
          status: entry.status,
        },
      });

      if (updated.count > 0) {
        continue;
      }
    }

    await prisma.instagramWeeklyScheduleEntry.upsert({
      where: {
        scheduleId_canonicalMenuNameNorm_scheduledFor: {
          scheduleId,
          canonicalMenuNameNorm: entry.canonicalMenuNameNorm,
          scheduledFor: entry.scheduledFor,
        },
      },
      create: {
        scheduleId,
        locationId,
        instagramCampaignId: entry.instagramCampaignId,
        instagramPostId: entry.instagramPostId,
        canonicalMenuName: entry.canonicalMenuName,
        canonicalMenuNameNorm: entry.canonicalMenuNameNorm,
        scheduledFor: entry.scheduledFor,
        daypart: entry.daypart,
        confidence: entry.confidence,
        rationale: entry.rationale,
        status: entry.status,
      },
      update: {
        instagramCampaignId: entry.instagramCampaignId,
        instagramPostId: entry.instagramPostId,
        canonicalMenuName: entry.canonicalMenuName,
        daypart: entry.daypart,
        confidence: entry.confidence,
        rationale: entry.rationale,
        status: entry.status,
      },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const readiness = await getSchedulerStorageReadiness();
    if (!readiness.delegateReady || !readiness.tablesReady) {
      return schedulerStorageNotReadyResponse(readiness);
    }

    const locationId = Number(req.nextUrl.searchParams.get("locationId"));
    const weekStartDateRaw = req.nextUrl.searchParams.get("weekStartDate");

    if (!Number.isInteger(locationId)) {
      return NextResponse.json(
        {
          error: "locationId must be a valid integer",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              trust: { qualityStatus: "failed", reasons: ["invalid_location_id"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    let weekStartDate: Date | undefined;
    if (weekStartDateRaw) {
      weekStartDate = parseDate(weekStartDateRaw) ?? undefined;
      if (!weekStartDate) {
        return NextResponse.json(
          {
            error: "weekStartDate must be a valid date string",
            contract: createDecisionApiContract({
              surface: "scheduler",
              context: createDecisionContext({
                persona: "marketer",
                locationId,
                trust: { qualityStatus: "failed", reasons: ["invalid_week_start_date"] },
              }),
              readiness: "blocked",
              confidence: "blocked",
            }),
          },
          { status: 400 },
        );
      }
    }

    const schedules = await prisma.instagramWeeklySchedule.findMany({
      where: {
        locationId,
        ...(weekStartDate ? { weekStartDate } : {}),
      },
      include: {
        entries: {
          orderBy: { scheduledFor: "asc" },
        },
      },
      orderBy: { weekStartDate: "desc" },
      take: weekStartDate ? 1 : 12,
    });
    const guardrail = await getSchedulingGuardrail(locationId);

    return NextResponse.json(
      {
        schedules,
        guardrail,
        contract: createSchedulerContract({
          locationId,
          filterState: { weekStartDate: weekStartDate?.toISOString() ?? null },
          guardrail,
          evidenceMetric: "schedule_count",
          evidenceValue: schedules.length,
        }),
      },
      { status: 200 },
    );
  } catch (error) {
    if (isMissingSchedulerStorageError(error)) {
      return schedulerStorageNotReadyResponse({
        delegateReady: hasSchedulerDelegates(),
        tablesReady: false,
      });
    }
    console.error("List Instagram weekly schedules error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        contract: createDecisionApiContract({
          surface: "scheduler",
          context: createDecisionContext({
            persona: "marketer",
            trust: { qualityStatus: "failed", reasons: ["internal_server_error"] },
          }),
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const readiness = await getSchedulerStorageReadiness();
    if (!readiness.delegateReady || !readiness.tablesReady) {
      return schedulerStorageNotReadyResponse(readiness);
    }

    const body = (await req.json()) as Partial<UpsertInstagramWeeklyScheduleRequest>;
    const locationId = Number(body.locationId);

    if (!Number.isInteger(locationId)) {
      return NextResponse.json(
        {
          error: "locationId must be a valid integer",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              trust: { qualityStatus: "failed", reasons: ["invalid_location_id"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const weekRange = normalizeWeekRange(String(body.weekStartDate ?? ""), body.weekEndDate);
    if (!weekRange) {
      return NextResponse.json(
        {
          error: "weekStartDate/weekEndDate must be valid date values",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["invalid_week_range"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const { entries, invalid } = normalizeEntries(body.entries);
    if (invalid) {
      return NextResponse.json(
        {
          error: "entries contain invalid values",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["invalid_entries"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const referencesOk = await validateReferenceOwnership(locationId, entries);
    if (!referencesOk) {
      return NextResponse.json(
        {
          error: "instagramCampaignId/instagramPostId references must exist and belong to locationId",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["invalid_references"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json(
        {
          error: "Location not found",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["location_not_found"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 404 },
      );
    }

    const status = normalizeScheduleStatus(body.status) ?? "draft";
    const replaceEntries = body.replaceEntries === true;
    const source = String(body.source ?? "manual");
    const guardrail = await getSchedulingGuardrail(locationId);

    if (guardrail.readiness === "blocked" && entries.length > 0 && source.startsWith("scheduler")) {
      return NextResponse.json(
        {
          error: "SCHEDULER_BLOCKED_BY_READINESS",
          guardrail,
          contract: createSchedulerContract({
            locationId,
            guardrail,
            evidenceMetric: "entry_count",
            evidenceValue: entries.length,
          }),
        },
        { status: 409 },
      );
    }

    const entriesWithGuardrails = applyEntryGuardrails(entries, guardrail);

    const schedule = await prisma.instagramWeeklySchedule.upsert({
      where: {
        locationId_weekStartDate: {
          locationId,
          weekStartDate: weekRange.weekStartDate,
        },
      },
      create: {
        locationId,
        weekStartDate: weekRange.weekStartDate,
        weekEndDate: weekRange.weekEndDate,
        status,
        source,
      },
      update: {
        weekEndDate: weekRange.weekEndDate,
        status,
        source,
      },
    });

    await persistEntries(schedule.id, locationId, entriesWithGuardrails, replaceEntries);

    const scheduleWithEntries = await prisma.instagramWeeklySchedule.findUnique({
      where: { id: schedule.id },
      include: {
        entries: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    return NextResponse.json(
      {
        schedule: scheduleWithEntries,
        guardrail,
        contract: createSchedulerContract({
          locationId,
          guardrail,
          filterState: { source, replaceEntries },
          evidenceMetric: "entry_count",
          evidenceValue: scheduleWithEntries?.entries?.length ?? 0,
        }),
      },
      { status: 200 },
    );
  } catch (error) {
    if (isMissingSchedulerStorageError(error)) {
      return schedulerStorageNotReadyResponse({
        delegateReady: hasSchedulerDelegates(),
        tablesReady: false,
      });
    }
    console.error("Upsert Instagram weekly schedule error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        contract: createDecisionApiContract({
          surface: "scheduler",
          context: createDecisionContext({
            persona: "marketer",
            trust: { qualityStatus: "failed", reasons: ["internal_server_error"] },
          }),
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const readiness = await getSchedulerStorageReadiness();
    if (!readiness.delegateReady || !readiness.tablesReady) {
      return schedulerStorageNotReadyResponse(readiness);
    }

    const body = (await req.json()) as Partial<UpdateInstagramWeeklyScheduleRequest> & { scheduleId?: number };
    const scheduleId = Number(body.scheduleId);
    const locationId = Number(body.locationId);

    if (!Number.isInteger(scheduleId) || !Number.isInteger(locationId)) {
      return NextResponse.json(
        {
          error: "scheduleId and locationId must be valid integers",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              trust: { qualityStatus: "failed", reasons: ["invalid_identifiers"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const current = await prisma.instagramWeeklySchedule.findUnique({
      where: { id: scheduleId },
      select: { id: true, locationId: true },
    });
    if (!current) {
      return NextResponse.json(
        {
          error: "Schedule not found",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["schedule_not_found"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 404 },
      );
    }
    if (current.locationId !== locationId) {
      return NextResponse.json(
        {
          error: "scheduleId does not belong to locationId",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["schedule_location_mismatch"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const statusFromAction = req.nextUrl.searchParams.get("action") === "finalize" ? "finalized" : undefined;
    const status = normalizeScheduleStatus(body.status) ?? statusFromAction;

    const { entries, invalid } = normalizeEntries(body.entries);
    if (invalid) {
      return NextResponse.json(
        {
          error: "entries contain invalid values",
          contract: createDecisionApiContract({
            surface: "scheduler",
            context: createDecisionContext({
              persona: "marketer",
              locationId,
              trust: { qualityStatus: "failed", reasons: ["invalid_entries"] },
            }),
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    if (entries.length > 0) {
      const referencesOk = await validateReferenceOwnership(locationId, entries);
      if (!referencesOk) {
        return NextResponse.json(
          {
            error: "instagramCampaignId/instagramPostId references must exist and belong to locationId",
            contract: createDecisionApiContract({
              surface: "scheduler",
              context: createDecisionContext({
                persona: "marketer",
                locationId,
                trust: { qualityStatus: "failed", reasons: ["invalid_references"] },
              }),
              readiness: "blocked",
              confidence: "blocked",
            }),
          },
          { status: 400 },
        );
      }
    }

    const guardrail = await getSchedulingGuardrail(locationId);
    if (guardrail.readiness === "blocked" && entries.length > 0) {
      const finalizing = req.nextUrl.searchParams.get("action") === "finalize";
      if (finalizing) {
        return NextResponse.json(
          {
            error: "SCHEDULER_FINALIZE_BLOCKED_BY_READINESS",
            guardrail,
            contract: createSchedulerContract({
              locationId,
              guardrail,
              evidenceMetric: "entry_count",
              evidenceValue: entries.length,
            }),
          },
          { status: 409 },
        );
      }
    }

    await prisma.instagramWeeklySchedule.update({
      where: { id: scheduleId },
      data: {
        ...(status ? { status } : {}),
        ...(body.source ? { source: String(body.source) } : {}),
      },
    });

    const entriesWithGuardrails = applyEntryGuardrails(entries, guardrail);
    if (entriesWithGuardrails.length > 0 || body.replaceEntries === true) {
      await persistEntries(scheduleId, locationId, entriesWithGuardrails, body.replaceEntries === true);
    }

    const schedule = await prisma.instagramWeeklySchedule.findUnique({
      where: { id: scheduleId },
      include: {
        entries: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    return NextResponse.json(
      {
        schedule,
        guardrail,
        contract: createSchedulerContract({
          locationId,
          guardrail,
          filterState: {
            status,
            replaceEntries: body.replaceEntries === true,
          },
          evidenceMetric: "entry_count",
          evidenceValue: schedule?.entries?.length ?? 0,
        }),
      },
      { status: 200 },
    );
  } catch (error) {
    if (isMissingSchedulerStorageError(error)) {
      return schedulerStorageNotReadyResponse({
        delegateReady: hasSchedulerDelegates(),
        tablesReady: false,
      });
    }
    console.error("Update Instagram weekly schedule error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        contract: createDecisionApiContract({
          surface: "scheduler",
          context: createDecisionContext({
            persona: "marketer",
            trust: { qualityStatus: "failed", reasons: ["internal_server_error"] },
          }),
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 500 },
    );
  }
}
