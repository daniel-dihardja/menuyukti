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

/** Attribution data is not yet provided by the GraphQL service; returns empty until the service exposes it. */
export async function loadInstagramAttribution(_query: InstagramAttributionQuery): Promise<InstagramAttributionRow[]> {
  return [];
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
