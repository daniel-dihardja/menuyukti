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
