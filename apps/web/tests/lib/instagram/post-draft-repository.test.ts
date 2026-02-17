import { describe, expect, it, vi } from "vitest";

import {
  createOrReplacePostDraftForScheduleEntry,
  getPostDraftByScheduleEntryId,
  transitionPostDraftStatus,
} from "@/lib/instagram/post-draft-repository";

function buildClient() {
  const draft = {
    id: 21,
    status: "draft",
    version: 1,
    approvedAt: null,
    publishedAt: null,
    statusHistory: [],
  };

  return {
    draft,
    client: {
      instagramSchedulePostDraft: {
        upsert: vi.fn(async () => draft),
        findUnique: vi.fn(async () => draft),
        update: vi.fn(async () => ({ ...draft, status: "approved", version: 2 })),
      },
      instagramSchedulePostDraftHistory: {
        create: vi.fn(async () => ({})),
      },
    },
  };
}

describe("post draft repository", () => {
  it("creates or replaces draft by schedule entry", async () => {
    const { client } = buildClient();

    const result = await createOrReplacePostDraftForScheduleEntry(client as never, {
      locationId: 1,
      analyticsId: 1,
      scheduleId: 3,
      scheduleEntryId: 5,
      payload: {
        caption: "Combo offer tonight",
        hashtags: ["#combo", "#combo", " #dinner "],
      },
      actor: "test-suite",
    });

    expect(result.id).toBe(21);
    expect(client.instagramSchedulePostDraft.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = (client.instagramSchedulePostDraft.upsert as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0] as
      | {
          where: { scheduleEntryId: number };
          create: { status: string; hashtagsJson: string[] };
        }
      | undefined;
    expect(upsertArg).toBeDefined();
    if (!upsertArg) return;
    expect(upsertArg.where.scheduleEntryId).toBe(5);
    expect(upsertArg.create.status).toBe("draft");
    expect(upsertArg.create.hashtagsJson).toEqual(["#combo", "#dinner"]);
    expect(client.instagramSchedulePostDraftHistory.create).toHaveBeenCalledTimes(1);
  });

  it("loads draft by schedule entry id", async () => {
    const { client } = buildClient();

    const draft = await getPostDraftByScheduleEntryId(client as never, 9);

    expect(draft?.id).toBe(21);
    expect(client.instagramSchedulePostDraft.findUnique).toHaveBeenCalledWith({
      where: { scheduleEntryId: 9 },
      include: { statusHistory: true },
    });
  });

  it("enforces valid status transitions", async () => {
    const { client } = buildClient();

    await expect(
      transitionPostDraftStatus(client as never, {
        draftId: 21,
        toStatus: "published",
      }),
    ).rejects.toThrow("INVALID_DRAFT_STATUS_TRANSITION:draft->published");
  });
});
