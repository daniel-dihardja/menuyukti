import { describe, expect, it } from "vitest";
import {
  avgDemandPerRow,
  deriveHeatmapAnalystInsights,
  deriveHeatmapMarketerInsights,
  formatPct,
} from "@/lib/analytics/heatmap-insights";

describe("heatmap insights", () => {
  const dailyLabels = ["08:00", "09:00", "10:00"];
  const weeklyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const dailyRows = [
    { key: "latte", label: "Iced Latte", values: [5, 12, 4] },
    { key: "tea", label: "Iced Tea", values: [2, 7, 3] },
  ];

  const weeklyRows = [
    { key: "latte", label: "Iced Latte", values: [4, 4, 3, 3, 4, 2, 1] },
    { key: "tea", label: "Iced Tea", values: [3, 3, 2, 2, 3, 1, 1] },
  ];

  it("derives marketer peak and weak windows", () => {
    const result = deriveHeatmapMarketerInsights(dailyRows, dailyLabels);
    expect(result.peakWindow?.label).toBe("09:00");
    expect(result.weakWindow?.label).toBe("10:00");
    expect(result.menuFocusAtPeak?.menu).toBe("Iced Latte");
  });

  it("derives analyst bias and concentration risk", () => {
    const result = deriveHeatmapAnalystInsights(
      dailyRows,
      dailyLabels,
      weeklyRows,
      weeklyLabels,
    );
    expect(result.weekdayWeekendBias).toBe("weekday");
    expect(result.concentrationRisk?.menu).toBe("Iced Latte");
    expect((result.concentrationRisk?.share ?? 0) > 0.5).toBe(true);
  });

  it("formats utility values", () => {
    expect(formatPct(0.321)).toBe("32.1%");
    expect(avgDemandPerRow(dailyRows)).toBe(16.5);
  });
});
