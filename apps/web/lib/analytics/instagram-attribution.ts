import { prisma } from "@/lib/prisma/client";

export type InstagramAttributionRow = {
  instagramPostId: number;
  campaignId: number | null;
  locationId: number;
  publishedAt: Date;
  canonicalMenuName: string;
  preQty: number;
  postQty: number;
  deltaQty: number;
  preRevenue: number;
  postRevenue: number;
  deltaRevenue: number;
  preMargin: number;
  postMargin: number;
  deltaMargin: number;
  preActiveDays: number;
  postActiveDays: number;
  confidenceLevel: string;
  attributionWindowDays: number;
};

export type InstagramAttributionQuery = {
  locationId: number;
  from: Date | null;
  to: Date | null;
  limit: number;
};

export type InstagramAttributionOverview = {
  totalRows: number;
  uniquePosts: number;
  uniqueItems: number;
  positiveRevenueRows: number;
  avgDeltaRevenue: number;
  avgDeltaQty: number;
};

export type AttributionViewState = "loaded" | "empty" | "error";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const maybeToNumber = (value as { toNumber?: () => unknown }).toNumber;
    if (typeof maybeToNumber === "function") {
      const parsed = Number(maybeToNumber.call(value));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
}

export async function loadInstagramAttribution(query: InstagramAttributionQuery): Promise<InstagramAttributionRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      instagram_post_id: number;
      campaign_id: number | null;
      location_id: number;
      published_at: Date;
      canonical_menu_name: string;
      pre_qty: string | number;
      post_qty: string | number;
      delta_qty: string | number;
      pre_revenue: string | number;
      post_revenue: string | number;
      delta_revenue: string | number;
      pre_margin: string | number;
      post_margin: string | number;
      delta_margin: string | number;
      pre_active_days: number;
      post_active_days: number;
      confidence_level: string;
      attribution_window_days: number;
    }>
  >`
    SELECT
      instagram_post_id,
      campaign_id,
      location_id,
      published_at,
      canonical_menu_name,
      pre_qty,
      post_qty,
      delta_qty,
      pre_revenue,
      post_revenue,
      delta_revenue,
      pre_margin,
      post_margin,
      delta_margin,
      pre_active_days,
      post_active_days,
      confidence_level,
      attribution_window_days
    FROM marts.vw_instagram_item_attribution_pre_post
    WHERE location_id = ${query.locationId}
      AND (${query.from}::timestamptz IS NULL OR published_at >= ${query.from}::timestamptz)
      AND (${query.to}::timestamptz IS NULL OR published_at < ${query.to}::timestamptz)
    ORDER BY published_at DESC, instagram_post_id DESC, canonical_menu_name ASC
    LIMIT ${query.limit}
  `;

  return rows.map((row) => ({
    instagramPostId: row.instagram_post_id,
    campaignId: row.campaign_id,
    locationId: row.location_id,
    publishedAt: new Date(row.published_at),
    canonicalMenuName: row.canonical_menu_name,
    preQty: toNumber(row.pre_qty),
    postQty: toNumber(row.post_qty),
    deltaQty: toNumber(row.delta_qty),
    preRevenue: toNumber(row.pre_revenue),
    postRevenue: toNumber(row.post_revenue),
    deltaRevenue: toNumber(row.delta_revenue),
    preMargin: toNumber(row.pre_margin),
    postMargin: toNumber(row.post_margin),
    deltaMargin: toNumber(row.delta_margin),
    preActiveDays: row.pre_active_days,
    postActiveDays: row.post_active_days,
    confidenceLevel: row.confidence_level,
    attributionWindowDays: row.attribution_window_days,
  }));
}

export function summarizeAttribution(rows: InstagramAttributionRow[]): InstagramAttributionOverview {
  if (rows.length === 0) {
    return {
      totalRows: 0,
      uniquePosts: 0,
      uniqueItems: 0,
      positiveRevenueRows: 0,
      avgDeltaRevenue: 0,
      avgDeltaQty: 0,
    };
  }

  const uniquePosts = new Set(rows.map((row) => row.instagramPostId)).size;
  const uniqueItems = new Set(rows.map((row) => row.canonicalMenuName.toLowerCase())).size;
  const positiveRevenueRows = rows.filter((row) => row.deltaRevenue > 0).length;
  const totalDeltaRevenue = rows.reduce((sum, row) => sum + row.deltaRevenue, 0);
  const totalDeltaQty = rows.reduce((sum, row) => sum + row.deltaQty, 0);

  return {
    totalRows: rows.length,
    uniquePosts,
    uniqueItems,
    positiveRevenueRows,
    avgDeltaRevenue: totalDeltaRevenue / rows.length,
    avgDeltaQty: totalDeltaQty / rows.length,
  };
}

export function resolveAttributionViewState(rows: InstagramAttributionRow[], loadError: string | null): AttributionViewState {
  if (loadError) return "error";
  if (rows.length === 0) return "empty";
  return "loaded";
}
