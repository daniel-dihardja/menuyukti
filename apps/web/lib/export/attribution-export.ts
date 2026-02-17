import type { InstagramAttributionRow } from "@/lib/analytics/instagram-attribution";
import type { AttributionConfidenceRule } from "@/lib/analytics/instagram-attribution-confidence";

export type AttributionExportMeta = {
  generatedAt: string;
  analyticsId: number;
  locationId: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  qualityStatus: string | null;
  freshnessMinutes: number | null;
  isStale: boolean;
  minActiveDays: number;
  minCoverageRatio: number;
  from: Date | null;
  to: Date | null;
  limit: number;
};

export type AttributionConfidenceComputed = {
  confidence: "high" | "medium" | "low" | "blocked";
  sourceConfidence: "high" | "medium" | "low" | "blocked";
  downgraded: boolean;
  reasons: AttributionConfidenceRule[];
  coverageRatio: number;
};

export function buildAttributionExportRows(
  rows: InstagramAttributionRow[],
  meta: AttributionExportMeta,
  confidenceByKey: Map<string, AttributionConfidenceComputed>,
): Array<Record<string, string | number | boolean | Date | null>> {
  return rows.map((row) => {
    const key = `${row.instagramPostId}::${row.canonicalMenuName.trim().toLowerCase()}`;
    const confidence = confidenceByKey.get(key);

    return {
      dataset: "attribution",
      generated_at: meta.generatedAt,
      analytics_id: meta.analyticsId,
      location_id: meta.locationId,
      period_start: meta.periodStart,
      period_end: meta.periodEnd,
      from: meta.from,
      to: meta.to,
      export_limit: meta.limit,
      quality_status: meta.qualityStatus,
      freshness_minutes: meta.freshnessMinutes,
      is_stale: meta.isStale,
      min_active_days: meta.minActiveDays,
      min_coverage_ratio: meta.minCoverageRatio,
      instagram_post_id: row.instagramPostId,
      campaign_id: row.campaignId,
      published_at: row.publishedAt,
      canonical_menu_name: row.canonicalMenuName,
      attribution_window_days: row.attributionWindowDays,
      pre_active_days: row.preActiveDays,
      post_active_days: row.postActiveDays,
      pre_qty: row.preQty,
      post_qty: row.postQty,
      delta_qty: row.deltaQty,
      pre_revenue: row.preRevenue,
      post_revenue: row.postRevenue,
      delta_revenue: row.deltaRevenue,
      pre_margin: row.preMargin,
      post_margin: row.postMargin,
      delta_margin: row.deltaMargin,
      source_confidence: confidence?.sourceConfidence ?? row.confidenceLevel,
      confidence: confidence?.confidence ?? row.confidenceLevel,
      confidence_downgraded: confidence?.downgraded ?? false,
      confidence_reasons: confidence ? confidence.reasons.join("|") : "",
      coverage_ratio: confidence?.coverageRatio ?? 0,
    };
  });
}

export const ATTRIBUTION_EXPORT_COLUMNS = [
  "dataset",
  "generated_at",
  "analytics_id",
  "location_id",
  "period_start",
  "period_end",
  "from",
  "to",
  "export_limit",
  "quality_status",
  "freshness_minutes",
  "is_stale",
  "min_active_days",
  "min_coverage_ratio",
  "instagram_post_id",
  "campaign_id",
  "published_at",
  "canonical_menu_name",
  "attribution_window_days",
  "pre_active_days",
  "post_active_days",
  "pre_qty",
  "post_qty",
  "delta_qty",
  "pre_revenue",
  "post_revenue",
  "delta_revenue",
  "pre_margin",
  "post_margin",
  "delta_margin",
  "source_confidence",
  "confidence",
  "confidence_downgraded",
  "confidence_reasons",
  "coverage_ratio",
] as const;
