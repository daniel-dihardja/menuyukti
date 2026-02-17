import { Prisma, type PrismaClient } from "@prisma/client";

export type InstagramPostDraftStatus = "draft" | "approved" | "published";

export type PostDraftPayload = {
  campaignObjective?: string | null;
  offerType?: string | null;
  caption: string;
  callToAction?: string | null;
  hashtags?: string[];
  suggestedPublishAt?: Date | null;
  generationInput?: Record<string, unknown> | null;
  generationOutput?: Record<string, unknown> | null;
  sourceSignals?: Record<string, unknown> | null;
};

export type CreatePostDraftInput = {
  locationId: number;
  analyticsId?: number | null;
  scheduleId: number;
  scheduleEntryId: number;
  payload: PostDraftPayload;
  actor?: string | null;
};

export type UpdatePostDraftContentInput = {
  draftId: number;
  payload: PostDraftPayload;
  actor?: string | null;
};

export type TransitionPostDraftStatusInput = {
  draftId: number;
  toStatus: InstagramPostDraftStatus;
  actor?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

type DraftModel = Prisma.InstagramSchedulePostDraftGetPayload<{
  include: { statusHistory: true };
}>;

type PostDraftClient = Pick<PrismaClient, "instagramSchedulePostDraft" | "instagramSchedulePostDraftHistory">;

const ALLOWED_TRANSITIONS: Record<InstagramPostDraftStatus, InstagramPostDraftStatus[]> = {
  draft: ["approved"],
  approved: ["draft", "published"],
  published: ["published"],
};

function sanitizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function toNullableJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function toDraftData(payload: PostDraftPayload) {
  return {
    campaignObjective: payload.campaignObjective ?? null,
    offerType: payload.offerType ?? null,
    caption: payload.caption.trim(),
    callToAction: payload.callToAction?.trim() || null,
    hashtagsJson: sanitizeTags(payload.hashtags),
    suggestedPublishAt: payload.suggestedPublishAt ?? null,
    generationInputJson: toNullableJsonInput(payload.generationInput),
    generationOutputJson: toNullableJsonInput(payload.generationOutput),
    sourceSignalsJson: toNullableJsonInput(payload.sourceSignals),
  };
}

function assertCanTransition(fromStatus: InstagramPostDraftStatus, toStatus: InstagramPostDraftStatus): void {
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new Error(`INVALID_DRAFT_STATUS_TRANSITION:${fromStatus}->${toStatus}`);
  }
}

export async function createOrReplacePostDraftForScheduleEntry(
  client: PostDraftClient,
  input: CreatePostDraftInput,
): Promise<DraftModel> {
  const payload = toDraftData(input.payload);
  const draft = await client.instagramSchedulePostDraft.upsert({
    where: { scheduleEntryId: input.scheduleEntryId },
    create: {
      location: { connect: { id: input.locationId } },
      analytics: input.analyticsId ? { connect: { id: input.analyticsId } } : undefined,
      schedule: { connect: { id: input.scheduleId } },
      scheduleEntry: { connect: { id: input.scheduleEntryId } },
      status: "draft",
      version: 1,
      ...payload,
    },
    update: {
      ...payload,
      status: "draft",
      approvedAt: null,
      publishedAt: null,
      version: { increment: 1 },
    },
    include: { statusHistory: true },
  });

  await client.instagramSchedulePostDraftHistory.create({
    data: {
      draft: { connect: { id: draft.id } },
      fromStatus: null,
      toStatus: "draft",
      actor: input.actor ?? "scheduler",
      reason: "upsert_draft",
      metadata: {
        scheduleEntryId: input.scheduleEntryId,
        version: draft.version,
      },
    },
  });

  return draft;
}

export async function getPostDraftByScheduleEntryId(
  client: PostDraftClient,
  scheduleEntryId: number,
): Promise<DraftModel | null> {
  return client.instagramSchedulePostDraft.findUnique({
    where: { scheduleEntryId },
    include: { statusHistory: true },
  });
}

export async function updatePostDraftContent(
  client: PostDraftClient,
  input: UpdatePostDraftContentInput,
): Promise<DraftModel> {
  const payload = toDraftData(input.payload);

  const draft = await client.instagramSchedulePostDraft.update({
    where: { id: input.draftId },
    data: {
      ...payload,
      version: { increment: 1 },
    },
    include: { statusHistory: true },
  });

  await client.instagramSchedulePostDraftHistory.create({
    data: {
      draft: { connect: { id: draft.id } },
      fromStatus: draft.status,
      toStatus: draft.status,
      actor: input.actor ?? "scheduler",
      reason: "content_update",
      metadata: { version: draft.version },
    },
  });

  return draft;
}

export async function transitionPostDraftStatus(
  client: PostDraftClient,
  input: TransitionPostDraftStatusInput,
): Promise<DraftModel> {
  const current = await client.instagramSchedulePostDraft.findUnique({
    where: { id: input.draftId },
    include: { statusHistory: true },
  });
  if (!current) {
    throw new Error("POST_DRAFT_NOT_FOUND");
  }

  const fromStatus = current.status as InstagramPostDraftStatus;
  assertCanTransition(fromStatus, input.toStatus);

  const now = new Date();
  const draft = await client.instagramSchedulePostDraft.update({
    where: { id: input.draftId },
    data: {
      status: input.toStatus,
      approvedAt: input.toStatus === "approved" ? now : current.approvedAt,
      publishedAt: input.toStatus === "published" ? now : current.publishedAt,
      version: { increment: 1 },
    },
    include: { statusHistory: true },
  });

  await client.instagramSchedulePostDraftHistory.create({
    data: {
      draft: { connect: { id: draft.id } },
      fromStatus,
      toStatus: input.toStatus,
      actor: input.actor ?? "scheduler",
      reason: input.reason ?? null,
      metadata: toNullableJsonInput(input.metadata),
    },
  });

  return draft;
}

export function createPostDraftRepository(client: PrismaClient) {
  return {
    createOrReplacePostDraftForScheduleEntry: (input: CreatePostDraftInput) =>
      createOrReplacePostDraftForScheduleEntry(client, input),
    getPostDraftByScheduleEntryId: (scheduleEntryId: number) =>
      getPostDraftByScheduleEntryId(client, scheduleEntryId),
    updatePostDraftContent: (input: UpdatePostDraftContentInput) =>
      updatePostDraftContent(client, input),
    transitionPostDraftStatus: (input: TransitionPostDraftStatusInput) =>
      transitionPostDraftStatus(client, input),
  };
}
