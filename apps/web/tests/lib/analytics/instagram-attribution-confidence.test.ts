import { describe, expect, it } from "vitest";

import type { InstagramAttributionRow } from "@/lib/analytics/instagram-attribution";
import {
  evaluateAttributionConfidence,
  parseConfidenceConfig,
} from "@/lib/analytics/instagram-attribution-confidence";

function row(overrides: Partial<InstagramAttributionRow> = {}): InstagramAttributionRow {
  return {
    instagramPostId: 1,
    campaignId: 11,
    locationId: 2,
    publishedAt: new Date("2026-02-10T00:00:00.000Z"),
    canonicalMenuName: "Burger Combo",
    preQty: 8,
    postQty: 12,
    deltaQty: 4,
    preRevenue: 80,
    postRevenue: 120,
    deltaRevenue: 40,
    preMargin: 20,
    postMargin: 32,
    deltaMargin: 12,
    preActiveDays: 3,
    postActiveDays: 3,
    confidenceLevel: "high",
    attributionWindowDays: 3,
    ...overrides,
  };
}

describe("evaluateAttributionConfidence", () => {
  it("keeps source confidence when thresholds are met", () => {
    const result = evaluateAttributionConfidence(row());
    expect(result.confidence).toBe("high");
    expect(result.downgraded).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("downgrades when active-day thresholds and coverage ratio fail", () => {
    const result = evaluateAttributionConfidence(
      row({
        preActiveDays: 1,
        postActiveDays: 1,
      }),
      {
        minActiveDays: 2,
        minCoverageRatio: 0.8,
      },
    );
    expect(result.confidence).toBe("low");
    expect(result.downgraded).toBe(true);
    expect(result.reasons).toEqual([
      "low_pre_active_days",
      "low_post_active_days",
      "low_coverage_ratio",
    ]);
  });

  it("forces blocked confidence when quality is failed", () => {
    const result = evaluateAttributionConfidence(row(), {}, { qualityStatus: "failed", isStale: false });
    expect(result.confidence).toBe("blocked");
    expect(result.reasons).toContain("quality_failed");
  });
});

describe("parseConfidenceConfig", () => {
  it("uses defaults when params are absent", () => {
    expect(parseConfidenceConfig(new URLSearchParams())).toEqual({
      minActiveDays: 2,
      minCoverageRatio: 0.67,
    });
  });

  it("accepts valid tuning params", () => {
    const params = new URLSearchParams();
    params.set("minActiveDays", "3");
    params.set("minCoverageRatio", "0.75");
    expect(parseConfidenceConfig(params)).toEqual({
      minActiveDays: 3,
      minCoverageRatio: 0.75,
    });
  });
});
