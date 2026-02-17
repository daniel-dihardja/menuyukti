import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import type {
  UpdateInstagramWeeklyScheduleRequest,
  UpsertInstagramWeeklyScheduleRequest,
} from "@/app/api/instagram/types";

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
    const locationId = Number(req.nextUrl.searchParams.get("locationId"));
    const weekStartDateRaw = req.nextUrl.searchParams.get("weekStartDate");

    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "locationId must be a valid integer" }, { status: 400 });
    }

    let weekStartDate: Date | undefined;
    if (weekStartDateRaw) {
      weekStartDate = parseDate(weekStartDateRaw) ?? undefined;
      if (!weekStartDate) {
        return NextResponse.json({ error: "weekStartDate must be a valid date string" }, { status: 400 });
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

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error) {
    console.error("List Instagram weekly schedules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<UpsertInstagramWeeklyScheduleRequest>;
    const locationId = Number(body.locationId);

    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "locationId must be a valid integer" }, { status: 400 });
    }

    const weekRange = normalizeWeekRange(String(body.weekStartDate ?? ""), body.weekEndDate);
    if (!weekRange) {
      return NextResponse.json({ error: "weekStartDate/weekEndDate must be valid date values" }, { status: 400 });
    }

    const { entries, invalid } = normalizeEntries(body.entries);
    if (invalid) {
      return NextResponse.json({ error: "entries contain invalid values" }, { status: 400 });
    }

    const referencesOk = await validateReferenceOwnership(locationId, entries);
    if (!referencesOk) {
      return NextResponse.json(
        { error: "instagramCampaignId/instagramPostId references must exist and belong to locationId" },
        { status: 400 },
      );
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const status = normalizeScheduleStatus(body.status) ?? "draft";
    const replaceEntries = body.replaceEntries === true;

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
        source: String(body.source ?? "manual"),
      },
      update: {
        weekEndDate: weekRange.weekEndDate,
        status,
        source: String(body.source ?? "manual"),
      },
    });

    await persistEntries(schedule.id, locationId, entries, replaceEntries);

    const scheduleWithEntries = await prisma.instagramWeeklySchedule.findUnique({
      where: { id: schedule.id },
      include: {
        entries: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    return NextResponse.json({ schedule: scheduleWithEntries }, { status: 200 });
  } catch (error) {
    console.error("Upsert Instagram weekly schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<UpdateInstagramWeeklyScheduleRequest> & { scheduleId?: number };
    const scheduleId = Number(body.scheduleId);
    const locationId = Number(body.locationId);

    if (!Number.isInteger(scheduleId) || !Number.isInteger(locationId)) {
      return NextResponse.json({ error: "scheduleId and locationId must be valid integers" }, { status: 400 });
    }

    const current = await prisma.instagramWeeklySchedule.findUnique({
      where: { id: scheduleId },
      select: { id: true, locationId: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    if (current.locationId !== locationId) {
      return NextResponse.json({ error: "scheduleId does not belong to locationId" }, { status: 400 });
    }

    const statusFromAction = req.nextUrl.searchParams.get("action") === "finalize" ? "finalized" : undefined;
    const status = normalizeScheduleStatus(body.status) ?? statusFromAction;

    const { entries, invalid } = normalizeEntries(body.entries);
    if (invalid) {
      return NextResponse.json({ error: "entries contain invalid values" }, { status: 400 });
    }

    if (entries.length > 0) {
      const referencesOk = await validateReferenceOwnership(locationId, entries);
      if (!referencesOk) {
        return NextResponse.json(
          { error: "instagramCampaignId/instagramPostId references must exist and belong to locationId" },
          { status: 400 },
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

    if (entries.length > 0 || body.replaceEntries === true) {
      await persistEntries(scheduleId, locationId, entries, body.replaceEntries === true);
    }

    const schedule = await prisma.instagramWeeklySchedule.findUnique({
      where: { id: scheduleId },
      include: {
        entries: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    return NextResponse.json({ schedule }, { status: 200 });
  } catch (error) {
    console.error("Update Instagram weekly schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
