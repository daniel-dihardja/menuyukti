import { describe, expect, it } from "vitest";

import {
  resolveAttributionViewState,
  summarizeAttribution,
  type InstagramAttributionRow,
} from "@/lib/analytics/instagram-attribution";

function row(overrides: Partial<InstagramAttributionRow> = {}): InstagramAttributionRow {
  return {
    instagramPostId: 1,
    campaignId: 10,
    locationId: 1,
    publishedAt: new Date("2026-02-10T08:00:00.000Z"),
    canonicalMenuName: "Iced Latte",
    preQty: 10,
    postQty: 15,
    deltaQty: 5,
    preRevenue: 100,
    postRevenue: 150,
    deltaRevenue: 50,
    preMargin: 0.2,
    postMargin: 0.3,
    deltaMargin: 0.1,
    preActiveDays: 3,
    postActiveDays: 3,
    confidenceLevel: "high",
    attributionWindowDays: 3,
    ...overrides,
  };
}

describe("summarizeAttribution", () => {
  it("returns zeroed summary for empty rows", () => {
    expect(summarizeAttribution([])).toEqual({
      totalRows: 0,
      uniquePosts: 0,
      uniqueItems: 0,
      positiveRevenueRows: 0,
      avgDeltaRevenue: 0,
      avgDeltaQty: 0,
    });
  });

  it("computes overview metrics for loaded rows", () => {
    const rows: InstagramAttributionRow[] = [
      row(),
      row({
        instagramPostId: 2,
        canonicalMenuName: "Burger",
        deltaRevenue: -20,
        deltaQty: -2,
      }),
    ];

    expect(summarizeAttribution(rows)).toEqual({
      totalRows: 2,
      uniquePosts: 2,
      uniqueItems: 2,
      positiveRevenueRows: 1,
      avgDeltaRevenue: 15,
      avgDeltaQty: 1.5,
    });
  });
});

describe("resolveAttributionViewState", () => {
  it("resolves empty state when rows are empty and no error", () => {
    expect(resolveAttributionViewState([], null)).toBe("empty");
  });

  it("resolves loaded state when rows are present", () => {
    expect(resolveAttributionViewState([row()], null)).toBe("loaded");
  });

  it("resolves error state when load error exists", () => {
    expect(resolveAttributionViewState([row()], "failed")).toBe("error");
  });
});
