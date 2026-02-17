import { describe, expect, it } from "vitest";

import { evaluateCogsReadiness } from "@/lib/analytics/cogs-readiness";

describe("evaluateCogsReadiness", () => {
  it("returns ready when coverage is above warn thresholds", () => {
    const result = evaluateCogsReadiness(
      {
        totalItems: 10,
        validCogsItems: 10,
        itemCoverageRatio: 1,
        totalRevenue: 1000,
        coveredRevenue: 980,
        revenueCoverageRatio: 0.98,
      },
      {
        itemWarn: 0.8,
        itemBlock: 0.5,
        revenueWarn: 0.85,
        revenueBlock: 0.6,
      },
    );

    expect(result.readiness).toBe("ready");
    expect(result.reasons).toEqual([]);
  });

  it("returns degraded when warn thresholds fail but block thresholds pass", () => {
    const result = evaluateCogsReadiness(
      {
        totalItems: 10,
        validCogsItems: 7,
        itemCoverageRatio: 0.7,
        totalRevenue: 1000,
        coveredRevenue: 700,
        revenueCoverageRatio: 0.7,
      },
      {
        itemWarn: 0.8,
        itemBlock: 0.5,
        revenueWarn: 0.85,
        revenueBlock: 0.6,
      },
    );

    expect(result.readiness).toBe("degraded");
    expect(result.reasons).toEqual([
      "low_cogs_item_coverage",
      "low_cogs_revenue_coverage",
    ]);
  });

  it("returns blocked when block threshold fails", () => {
    const result = evaluateCogsReadiness(
      {
        totalItems: 10,
        validCogsItems: 4,
        itemCoverageRatio: 0.4,
        totalRevenue: 1000,
        coveredRevenue: 590,
        revenueCoverageRatio: 0.59,
      },
      {
        itemWarn: 0.8,
        itemBlock: 0.5,
        revenueWarn: 0.85,
        revenueBlock: 0.6,
      },
    );

    expect(result.readiness).toBe("blocked");
    expect(result.reasons).toContain("low_cogs_item_coverage");
    expect(result.reasons).toContain("low_cogs_revenue_coverage");
  });
});
