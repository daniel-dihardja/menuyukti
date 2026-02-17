export type InstagramPlatform = "instagram";

export type InstagramCampaignStatus = "draft" | "scheduled" | "published" | "paused" | "archived";

export type InstagramPostStatus = "draft" | "scheduled" | "published" | "failed";

export type InstagramCampaignIdentity = {
  id: number;
  locationId: number;
  externalCampaignId: string | null;
  name: string;
  platform: InstagramPlatform;
  objective: string | null;
  status: InstagramCampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstagramPostIdentity = {
  id: number;
  locationId: number;
  campaignId: number | null;
  platform: InstagramPlatform;
  platformPostId: string | null;
  status: InstagramPostStatus;
  mediaType: string | null;
  caption: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstagramPostPromotedItem = {
  id: number;
  locationId: number;
  instagramPostId: number;
  canonicalMenuName: string;
  canonicalMenuNameNorm: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertInstagramPostPromotedItemsRequest = {
  locationId: number;
  instagramPostId: number;
  promotedItems: Array<{
    canonicalMenuName: string;
  }>;
};

export type InstagramWeeklyScheduleStatus = "draft" | "scheduled" | "finalized" | "cancelled";

export type InstagramWeeklyScheduleEntryStatus = "draft" | "scheduled" | "published" | "cancelled";

export type InstagramWeeklyScheduleEntryConfidence = "high" | "medium" | "low" | "blocked";

export type InstagramWeeklyScheduleEntry = {
  id: number;
  scheduleId: number;
  locationId: number;
  instagramCampaignId: number | null;
  instagramPostId: number | null;
  canonicalMenuName: string;
  canonicalMenuNameNorm: string;
  scheduledFor: string;
  daypart: string | null;
  confidence: InstagramWeeklyScheduleEntryConfidence;
  rationale: string | null;
  status: InstagramWeeklyScheduleEntryStatus;
  createdAt: string;
  updatedAt: string;
};

export type InstagramWeeklySchedule = {
  id: number;
  locationId: number;
  weekStartDate: string;
  weekEndDate: string;
  status: InstagramWeeklyScheduleStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  entries: InstagramWeeklyScheduleEntry[];
};

export type UpsertInstagramWeeklyScheduleRequest = {
  locationId: number;
  weekStartDate: string;
  weekEndDate?: string;
  status?: InstagramWeeklyScheduleStatus;
  source?: string;
  replaceEntries?: boolean;
  entries?: Array<{
    id?: number;
    instagramCampaignId?: number | null;
    instagramPostId?: number | null;
    canonicalMenuName: string;
    scheduledFor: string;
    daypart?: string | null;
    confidence?: InstagramWeeklyScheduleEntryConfidence;
    rationale?: string | null;
    status?: InstagramWeeklyScheduleEntryStatus;
  }>;
};

export type UpdateInstagramWeeklyScheduleRequest = {
  locationId: number;
  status?: InstagramWeeklyScheduleStatus;
  source?: string;
  replaceEntries?: boolean;
  entries?: Array<{
    id?: number;
    instagramCampaignId?: number | null;
    instagramPostId?: number | null;
    canonicalMenuName: string;
    scheduledFor: string;
    daypart?: string | null;
    confidence?: InstagramWeeklyScheduleEntryConfidence;
    rationale?: string | null;
    status?: InstagramWeeklyScheduleEntryStatus;
  }>;
};
