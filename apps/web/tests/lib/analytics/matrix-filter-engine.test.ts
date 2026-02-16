import { describe, expect, it } from "vitest";
import { applyMatrixFilterState } from "@/lib/analytics/matrix-filter-engine";
import { DEFAULT_MATRIX_FILTER_STATE } from "@/lib/analytics/matrix-filter-state";
import type { DecisionGradeMatrixRow } from "@/lib/analytics/matrix-row-contract";

const rows: DecisionGradeMatrixRow[] = [
  {
    menuItem: "Burger",
    category: "star",
    unitsSold: 120,
    revenue: 1800,
    cogs: 700,
    contributionMargin: 1100,
    marginPct: 0.6111,
    action: "keep",
    actionReason: "Strong baseline performance; keep and monitor.",
    reasonCode: "high_popularity_high_margin",
    popularityScore: 1.1,
    marginScore: 0.6111,
    thresholdsUsed: { avgPopularity: 1.0, avgContributionMargin: 0.4 },
  },
  {
    menuItem: "Salad",
    category: "puzzle",
    unitsSold: 20,
    revenue: 500,
    cogs: 150,
    contributionMargin: 350,
    marginPct: 0.7,
    action: "promote",
    actionReason: "High margin opportunity.",
    reasonCode: "low_popularity_high_margin",
    popularityScore: 0.6,
    marginScore: 0.7,
    thresholdsUsed: { avgPopularity: 1.0, avgContributionMargin: 0.4 },
  },
  {
    menuItem: "Soup",
    category: "plow_horse",
    unitsSold: 70,
    revenue: 700,
    cogs: 420,
    contributionMargin: 280,
    marginPct: 0.4,
    action: "reprice",
    actionReason: "Popular with weaker margin.",
    reasonCode: "high_popularity_low_margin",
    popularityScore: 1.2,
    marginScore: 0.4,
    thresholdsUsed: { avgPopularity: 1.0, avgContributionMargin: 0.4 },
  },
  {
    menuItem: "Old Tea",
    category: "low_end",
    unitsSold: 4,
    revenue: 40,
    cogs: 30,
    contributionMargin: 10,
    marginPct: 0.25,
    action: "remove",
    actionReason: "Low demand and low margin.",
    reasonCode: "low_popularity_low_margin",
    popularityScore: 0.2,
    marginScore: 0.25,
    thresholdsUsed: { avgPopularity: 1.0, avgContributionMargin: 0.4 },
  },
];

describe("applyMatrixFilterState", () => {
  it("applies combined filters consistently", () => {
    const filtered = applyMatrixFilterState(rows, {
      ...DEFAULT_MATRIX_FILTER_STATE,
      categories: ["puzzle", "plow_horse"],
      actions: ["promote", "reprice"],
      marginMin: 0.4,
      qtyMin: 10,
    });

    expect(filtered.map((row) => row.menuItem)).toEqual(["Soup", "Salad"]);
  });

  it("supports deterministic text filtering and sorting", () => {
    const first = applyMatrixFilterState(rows, {
      ...DEFAULT_MATRIX_FILTER_STATE,
      q: "s",
      sort: "menuItem",
      order: "asc",
    });

    const second = applyMatrixFilterState(rows, {
      ...DEFAULT_MATRIX_FILTER_STATE,
      q: "s",
      sort: "menuItem",
      order: "asc",
    });

    expect(first.map((row) => row.menuItem)).toEqual(["Salad", "Soup"]);
    expect(second).toEqual(first);
  });

  it("keeps stable output on ties using input order", () => {
    const tiedRows: DecisionGradeMatrixRow[] = [0, 1, 2].map((idx) => ({
      ...rows[idx]!,
      menuItem: String.fromCharCode(65 + idx),
      unitsSold: 10,
    }));

    const filtered = applyMatrixFilterState(tiedRows, {
      ...DEFAULT_MATRIX_FILTER_STATE,
      sort: "unitsSold",
      order: "desc",
    });

    expect(filtered.map((row) => row.menuItem)).toEqual(["A", "B", "C"]);
  });
});
