import {
  toDecisionGradeMatrixRows,
  type DecisionGradeMatrixRow,
} from "@/lib/analytics/matrix-row-contract";
import { describe, expect, it } from "vitest";

describe("toDecisionGradeMatrixRows", () => {
  it("maps matrix items into decision-grade rows", () => {
    const rows = toDecisionGradeMatrixRows({
      items: [
        {
          menu: "Nasi Goreng",
          category: "puzzle",
          quantity: 12,
          total_revenue: 120000,
          cogs: 42000,
          contribution_margin: 78000,
          contribution_margin_percentage: 0.65,
          action: "promote",
          reason_code: "low_popularity_high_margin",
          popularity_score: 0.73,
          margin_score: 0.65,
          thresholds_used: {
            avg_popularity: 0.9,
            avg_contribution_margin: 0.45,
          },
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual<DecisionGradeMatrixRow>({
      menuItem: "Nasi Goreng",
      category: "puzzle",
      unitsSold: 12,
      revenue: 120000,
      cogs: 42000,
      contributionMargin: 78000,
      marginPct: 0.65,
      action: "promote",
      actionReason: "Low Popularity High Margin",
      reasonCode: "low_popularity_high_margin",
      popularityScore: 0.73,
      marginScore: 0.65,
      thresholdsUsed: {
        avgPopularity: 0.9,
        avgContributionMargin: 0.45,
      },
    });
  });

  it("keeps cogs as null when source cogs is not available", () => {
    const rows = toDecisionGradeMatrixRows({
      items: [
        {
          menu: "Sate Ayam",
          category: "star",
          quantity: 20,
          total_revenue: 200000,
          cogs: null,
          contribution_margin: 100000,
          contribution_margin_percentage: 0.5,
          action: "keep",
        },
      ],
    });

    expect(rows[0]?.cogs).toBeNull();
    expect(rows[0]?.actionReason).toBe(
      "Strong baseline performance; keep and monitor.",
    );
  });

  it("sanitizes invalid values with deterministic defaults", () => {
    const rows = toDecisionGradeMatrixRows({
      items: [
        {
          menu: "",
          category: "invalid-category",
          quantity: "bad",
          total_revenue: -10,
          cogs: -12.456,
          contribution_margin: -999,
          contribution_margin_percentage: 9,
          action: "not-valid",
        },
      ],
    });

    expect(rows[0]).toMatchObject({
      menuItem: "Unknown Item 1",
      category: "low_end",
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      contributionMargin: 0,
      marginPct: 1,
      action: null,
      actionReason: "Recommendation unavailable; review volume and margin signals.",
    });
  });
});
