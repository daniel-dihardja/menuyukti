import { describe, expect, it } from "vitest";
import {
  DEFAULT_HEATMAP_FILTER_STATE,
  applyHeatmapFilterState,
  applyWeeklySegment,
  parseHeatmapFilterState,
  serializeHeatmapFilterState,
} from "@/lib/analytics/heatmap-filter-state";

const rows = [
  { key: "latte", label: "Iced Latte", values: [10, 20, 5] },
  { key: "tea", label: "Iced Tea", values: [5, 8, 4] },
  { key: "cake", label: "Cheese Cake", values: [2, 3, 1] },
];

const dailyLabels = ["08:00", "09:00", "10:00"];
const weeklyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weeklyRows = [
  { key: "latte", label: "Iced Latte", values: [4, 4, 4, 4, 4, 2, 2] },
  { key: "tea", label: "Iced Tea", values: [2, 2, 2, 2, 2, 3, 3] },
];

describe("heatmap filter state", () => {
  it("parses and serializes URL state deterministically", () => {
    const parsed = parseHeatmapFilterState({
      q: "latte",
      top: "15",
      segment: "weekday",
      sort: "window",
      sortWindow: "09:00",
      order: "asc",
      density: "compact",
    });
    expect(parsed).toEqual({
      q: "latte",
      top: 15,
      segment: "weekday",
      sort: "window",
      sortWindow: "09:00",
      order: "asc",
      density: "compact",
    });

    const serialized = serializeHeatmapFilterState(parsed);
    expect(serialized.get("q")).toBe("latte");
    expect(serialized.get("segment")).toBe("weekday");
    expect(serialized.get("sortWindow")).toBe("09:00");
    expect(serialized.get("density")).toBe("compact");
  });

  it("applies search + top + sorting", () => {
    const result = applyHeatmapFilterState(rows, dailyLabels, {
      ...DEFAULT_HEATMAP_FILTER_STATE,
      q: "iced",
      top: 1,
      sort: "total",
      order: "desc",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("Iced Latte");
  });

  it("supports sort by selected window", () => {
    const result = applyHeatmapFilterState(rows, dailyLabels, {
      ...DEFAULT_HEATMAP_FILTER_STATE,
      sort: "window",
      sortWindow: "10:00",
      order: "asc",
    });
    expect(result.map((row) => row.label)).toEqual([
      "Cheese Cake",
      "Iced Tea",
      "Iced Latte",
    ]);
  });

  it("segments weekly rows by weekday/weekend", () => {
    const weekday = applyWeeklySegment(weeklyRows, weeklyLabels, "weekday");
    expect(weekday.labels).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    expect(weekday.rows[0]?.values).toEqual([4, 4, 4, 4, 4]);

    const weekend = applyWeeklySegment(weeklyRows, weeklyLabels, "weekend");
    expect(weekend.labels).toEqual(["Sat", "Sun"]);
    expect(weekend.rows[1]?.values).toEqual([3, 3]);
  });
});
