import { NextRequest, NextResponse } from "next/server";

import {
  createOrReplacePostDraftForScheduleEntry,
  getPostDraftByScheduleEntryId,
  transitionPostDraftStatus,
  updatePostDraftContent,
  type InstagramPostDraftStatus,
} from "@/lib/instagram/post-draft-repository";
import { prisma } from "@/lib/prisma/client";

function serializeDraft(draft: {
  id: number;
  locationId: number;
  analyticsId: number | null;
  scheduleId: number;
  scheduleEntryId: number;
  status: string;
  campaignObjective: string | null;
  offerType: string | null;
  caption: string;
  callToAction: string | null;
  hashtagsJson: unknown;
  suggestedPublishAt: Date | null;
  generationInputJson: unknown;
  generationOutputJson: unknown;
  sourceSignalsJson: unknown;
  version: number;
  approvedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: draft.id,
    locationId: draft.locationId,
    analyticsId: draft.analyticsId,
    scheduleId: draft.scheduleId,
    scheduleEntryId: draft.scheduleEntryId,
    status: draft.status,
    campaignObjective: draft.campaignObjective,
    offerType: draft.offerType,
    caption: draft.caption,
    callToAction: draft.callToAction,
    hashtags: Array.isArray(draft.hashtagsJson) ? draft.hashtagsJson : [],
    suggestedPublishAt: draft.suggestedPublishAt?.toISOString() ?? null,
    generationInput: draft.generationInputJson ?? null,
    generationOutput: draft.generationOutputJson ?? null,
    sourceSignals: draft.sourceSignalsJson ?? null,
    version: draft.version,
    approvedAt: draft.approvedAt?.toISOString() ?? null,
    publishedAt: draft.publishedAt?.toISOString() ?? null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function parseStatus(raw: unknown): InstagramPostDraftStatus | null {
  if (raw === "draft" || raw === "approved" || raw === "published") return raw;
  return null;
}

export async function GET(request: NextRequest) {
  const scheduleEntryIdRaw = request.nextUrl.searchParams.get("scheduleEntryId");
  const scheduleEntryId = Number(scheduleEntryIdRaw);
  if (!Number.isInteger(scheduleEntryId) || scheduleEntryId <= 0) {
    return NextResponse.json({ error: "INVALID_SCHEDULE_ENTRY_ID" }, { status: 400 });
  }

  const draft = await getPostDraftByScheduleEntryId(prisma, scheduleEntryId);
  if (!draft) {
    return NextResponse.json({ error: "POST_DRAFT_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ draft: serializeDraft(draft) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    locationId?: number;
    analyticsId?: number | null;
    scheduleId?: number;
    scheduleEntryId?: number;
    campaignObjective?: string | null;
    offerType?: string | null;
    caption?: string;
    callToAction?: string | null;
    hashtags?: string[];
    suggestedPublishAt?: string | null;
    generationInput?: Record<string, unknown> | null;
    generationOutput?: Record<string, unknown> | null;
    sourceSignals?: Record<string, unknown> | null;
    actor?: string;
  };

  if (
    !Number.isInteger(body.locationId) ||
    !Number.isInteger(body.scheduleId) ||
    !Number.isInteger(body.scheduleEntryId) ||
    typeof body.caption !== "string" ||
    !body.caption.trim()
  ) {
    return NextResponse.json({ error: "INVALID_POST_DRAFT_PAYLOAD" }, { status: 400 });
  }
  const locationId = body.locationId as number;
  const scheduleId = body.scheduleId as number;
  const scheduleEntryId = body.scheduleEntryId as number;
  const caption = body.caption;

  const draft = await createOrReplacePostDraftForScheduleEntry(prisma, {
    locationId,
    analyticsId: body.analyticsId ?? null,
    scheduleId,
    scheduleEntryId,
    payload: {
      campaignObjective: body.campaignObjective ?? null,
      offerType: body.offerType ?? null,
      caption,
      callToAction: body.callToAction ?? null,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      suggestedPublishAt: body.suggestedPublishAt ? new Date(body.suggestedPublishAt) : null,
      generationInput: body.generationInput ?? null,
      generationOutput: body.generationOutput ?? null,
      sourceSignals: body.sourceSignals ?? null,
    },
    actor: body.actor ?? "scheduler_ui",
  });

  return NextResponse.json({ draft: serializeDraft(draft) });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    draftId?: number;
    toStatus?: string;
    caption?: string;
    callToAction?: string | null;
    hashtags?: string[];
    actor?: string;
    reason?: string | null;
  };

  if (!Number.isInteger(body.draftId)) {
    return NextResponse.json({ error: "INVALID_DRAFT_ID" }, { status: 400 });
  }
  const draftId = body.draftId as number;

  if (typeof body.caption === "string") {
    const updated = await updatePostDraftContent(prisma, {
      draftId,
      payload: {
        caption: body.caption,
        callToAction: body.callToAction ?? null,
        hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      },
      actor: body.actor ?? "scheduler_ui",
    });
    return NextResponse.json({ draft: serializeDraft(updated) });
  }

  const toStatus = parseStatus(body.toStatus);
  if (!toStatus) {
    return NextResponse.json({ error: "INVALID_POST_DRAFT_STATUS" }, { status: 400 });
  }

  try {
    const updated = await transitionPostDraftStatus(prisma, {
      draftId,
      toStatus,
      actor: body.actor ?? "scheduler_ui",
      reason: body.reason ?? null,
    });

    return NextResponse.json({ draft: serializeDraft(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED_TO_TRANSITION_DRAFT";
    const isTransitionError = message.includes("INVALID_DRAFT_STATUS_TRANSITION");
    const isMissingError = message.includes("POST_DRAFT_NOT_FOUND");
    if (isTransitionError || isMissingError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
