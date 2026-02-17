import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(request: NextRequest) {
  const draftId = Number(request.nextUrl.searchParams.get("draftId"));
  if (!Number.isInteger(draftId) || draftId <= 0) {
    return NextResponse.json({ error: "INVALID_DRAFT_ID" }, { status: 400 });
  }

  const draft = await prisma.instagramSchedulePostDraft.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      locationId: true,
      scheduleId: true,
      scheduleEntryId: true,
      status: true,
      campaignObjective: true,
      offerType: true,
      caption: true,
      callToAction: true,
      hashtagsJson: true,
      suggestedPublishAt: true,
      sourceSignalsJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "POST_DRAFT_NOT_FOUND" }, { status: 404 });
  }

  if (draft.status !== "approved" && draft.status !== "published") {
    return NextResponse.json({ error: "POST_DRAFT_NOT_APPROVED" }, { status: 400 });
  }

  const hashtags = Array.isArray(draft.hashtagsJson) ? draft.hashtagsJson.map((tag) => String(tag)) : [];
  const suggestedPublishAt = draft.suggestedPublishAt?.toISOString() ?? null;
  const filename = `instagram-post-package-${draft.id}-${toSlug(draft.offerType ?? "general")}.json`;

  const payload = {
    metadata: {
      draftId: draft.id,
      locationId: draft.locationId,
      scheduleId: draft.scheduleId,
      scheduleEntryId: draft.scheduleEntryId,
      status: draft.status,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    },
    publishing: {
      suggestedPublishAt,
      checklist: [
        "Validate caption brand tone",
        "Confirm hashtags and CTA",
        "Attach media in Instagram",
        "Publish at suggested time",
      ],
    },
    content: {
      campaignObjective: draft.campaignObjective,
      offerType: draft.offerType,
      caption: draft.caption,
      callToAction: draft.callToAction,
      hashtags,
    },
    sourceSignals: draft.sourceSignalsJson,
  };

  return NextResponse.json({ filename, payload });
}
