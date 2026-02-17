import { describe, expect, it } from "vitest";

import {
  cogsIssue,
  summarizeCogsCompleteness,
  summarizeCogsCoverage,
} from "@/lib/analytics/cogs-completeness";

describe("summarizeCogsCompleteness", () => {
  it("computes ratios and prioritizes missing/invalid items by impact", () => {
    const summary = summarizeCogsCompleteness([
      {
        id: 1,
        menuName: "A",
        cogs: 10,
        quantity: 20,
        totalRevenue: 200,
        menuCategory: "food",
      },
      {
        id: 2,
        menuName: "B",
        cogs: null,
        quantity: 30,
        totalRevenue: 300,
        menuCategory: "drink",
      },
      {
        id: 3,
        menuName: "C",
        cogs: 0,
        quantity: 10,
        totalRevenue: 100,
        menuCategory: null,
      },
    ]);

    expect(summary.totalItems).toBe(3);
    expect(summary.validCogsItems).toBe(1);
    expect(summary.missingOrInvalidItems).toBe(2);
    expect(summary.itemCompletenessRatio).toBeCloseTo(1 / 3);
    expect(summary.totalRevenue).toBe(600);
    expect(summary.coveredRevenue).toBe(200);
    expect(summary.revenueCoverageRatio).toBeCloseTo(1 / 3);
    expect(summary.prioritizedMissing.map((item) => item.menuName)).toEqual(["B", "C"]);
    expect(summary.prioritizedMissing[0]?.issue).toBe("missing");
    expect(summary.prioritizedMissing[1]?.issue).toBe("invalid");
  });

  it("returns empty-safe summary", () => {
    const summary = summarizeCogsCompleteness([]);
    expect(summary.totalItems).toBe(0);
    expect(summary.validCogsItems).toBe(0);
    expect(summary.missingOrInvalidItems).toBe(0);
    expect(summary.itemCompletenessRatio).toBe(0);
    expect(summary.revenueCoverageRatio).toBe(0);
    expect(summary.prioritizedMissing).toEqual([]);
  });

  it("computes cogs issue labels", () => {
    expect(cogsIssue(null)).toBe("missing");
    expect(cogsIssue(0)).toBe("invalid");
    expect(cogsIssue(1.5)).toBe("none");
  });

  it("computes cogs coverage summary for matrix-like rows", () => {
    const summary = summarizeCogsCoverage([
      { cogs: 20, revenue: 300 },
      { cogs: null, revenue: 150 },
      { cogs: 0, revenue: 100 },
    ]);

    expect(summary.totalItems).toBe(3);
    expect(summary.validCogsItems).toBe(1);
    expect(summary.itemCoverageRatio).toBeCloseTo(1 / 3);
    expect(summary.totalRevenue).toBe(550);
    expect(summary.coveredRevenue).toBe(300);
    expect(summary.revenueCoverageRatio).toBeCloseTo(300 / 550);
  });
});
