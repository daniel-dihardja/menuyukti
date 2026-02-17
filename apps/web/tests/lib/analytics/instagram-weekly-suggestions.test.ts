import { describe, expect, it } from "vitest";

import { buildWeeklyInstagramSuggestions } from "@/lib/analytics/instagram-weekly-suggestions";

describe("buildWeeklyInstagramSuggestions", () => {
  it("returns deterministic ranked weekly suggestions from heatmap data", () => {
    const heatmapJson = [
      {
        menu: "Chicken Bowl",
        dailyHeatmap: [
          { hour: "12:00", quantity: 24 },
          { hour: "13:00", quantity: 18 },
          { hour: "19:00", quantity: 14 },
        ],
      },
      {
        menu: "Iced Tea",
        dailyHeatmap: [
          { hour: "16:00", quantity: 50 },
          { hour: "17:00", quantity: 45 },
          { hour: "11:00", quantity: 10 },
        ],
      },
    ];

    const matrixJson = {
      items: [
        {
          menu: "Iced Tea",
          quantity: 100,
          total_revenue: 500,
          contribution_margin: 250,
          contribution_margin_percentage: 0.5,
          action: "promote",
        },
      ],
    };

    const suggestions = buildWeeklyInstagramSuggestions({
      heatmapJson,
      matrixJson,
      weekStartDate: new Date("2026-02-16T00:00:00.000Z"),
      limit: 2,
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.menuItem).toBe("Iced Tea");
    expect(suggestions[0]?.suggestedDaypart).toBe("afternoon");
    expect(suggestions[0]?.offerType).toBe("combo_offer");
    expect(suggestions[0]?.sourceSignals.matrixAction).toBe("promote");

    expect(suggestions[1]?.menuItem).toBe("Chicken Bowl");
    expect(suggestions[1]?.suggestedDaypart).toBe("lunch");
    expect(suggestions[1]?.rank).toBe(2);
  });

  it("returns empty list when heatmap input is missing", () => {
    const suggestions = buildWeeklyInstagramSuggestions({
      heatmapJson: null,
      matrixJson: null,
      weekStartDate: new Date("2026-02-16T00:00:00.000Z"),
    });

    expect(suggestions).toEqual([]);
  });

  it("falls back to matrix actions when heatmap is missing", () => {
    const suggestions = buildWeeklyInstagramSuggestions({
      heatmapJson: null,
      matrixJson: {
        items: [
          {
            menu: "Combo Rice",
            quantity: 70,
            total_revenue: 600,
            contribution_margin: 320,
            contribution_margin_percentage: 0.53,
            action: "promote",
          },
        ],
      },
      weekStartDate: new Date("2026-02-16T00:00:00.000Z"),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.menuItem).toBe("Combo Rice");
    expect(suggestions[0]?.sourceSignals.matrixAction).toBe("promote");
  });
});
