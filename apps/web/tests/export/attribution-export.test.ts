import { describe, expect, it } from "vitest";

import type { InstagramAttributionRow } from "@/lib/analytics/instagram-attribution";
import {
  ATTRIBUTION_EXPORT_COLUMNS,
  buildAttributionExportRows,
} from "@/lib/export/attribution-export";

function makeRow(overrides: Partial<InstagramAttributionRow> = {}): InstagramAttributionRow {
  return {
    instagramPostId: 41,
    campaignId: 9,
    locationId: 3,
    publishedAt: new Date("2026-02-12T08:00:00.000Z"),
    canonicalMenuName: "Chicken Bowl",
    preQty: 10,
    postQty: 15,
    deltaQty: 5,
    preRevenue: 100,
    postRevenue: 145,
    deltaRevenue: 45,
    preMargin: 40,
    postMargin: 60,
    deltaMargin: 20,
    preActiveDays: 3,
    postActiveDays: 3,
    confidenceLevel: "high",
    attributionWindowDays: 3,
    ...overrides,
  };
}

describe("buildAttributionExportRows", () => {
  it("produces contract-shaped rows with confidence fields", () => {
    const rows = buildAttributionExportRows(
      [makeRow()],
      {
        generatedAt: "2026-02-17T00:00:00.000Z",
        analyticsId: 88,
        locationId: 3,
        periodStart: new Date("2026-02-01T00:00:00.000Z"),
        periodEnd: new Date("2026-02-29T00:00:00.000Z"),
        qualityStatus: "passed",
        freshnessMinutes: 20,
        isStale: false,
        minActiveDays: 2,
        minCoverageRatio: 0.67,
        from: null,
        to: null,
        limit: 500,
      },
      new Map([
        [
          "41::chicken bowl",
          {
            confidence: "medium",
            sourceConfidence: "high",
            downgraded: true,
            reasons: ["quality_warn"],
            coverageRatio: 0.8,
          },
        ],
      ]),
    );

    expect(rows).toHaveLength(1);
    const first = rows[0];
    if (!first) {
      throw new Error("Expected first export row");
    }
    expect(Object.keys(first)).toEqual([...ATTRIBUTION_EXPORT_COLUMNS]);
    expect(first.confidence).toBe("medium");
    expect(first.source_confidence).toBe("high");
    expect(first.confidence_downgraded).toBe(true);
    expect(first.confidence_reasons).toBe("quality_warn");
    expect(first.coverage_ratio).toBe(0.8);
  });
});
