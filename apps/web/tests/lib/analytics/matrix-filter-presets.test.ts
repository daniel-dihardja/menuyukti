import { describe, expect, it } from "vitest";
import {
  getMatrixFilterPresets,
  getMatrixPresetDefinition,
} from "@/lib/analytics/matrix-filter-presets";

describe("matrix filter presets", () => {
  it("returns all expected preset definitions", () => {
    const presets = getMatrixFilterPresets();

    expect(presets.map((preset) => preset.key)).toEqual([
      "push_winners",
      "fix_pricing",
      "review_low_margin",
      "underperformers",
    ]);
  });

  it("maps push winners to deterministic filter state", () => {
    const preset = getMatrixPresetDefinition("push_winners");

    expect(preset.state).toMatchObject({
      categories: ["star", "puzzle"],
      actions: ["promote", "keep"],
      marginMin: 0.45,
      qtyMin: 20,
      sort: "revenue",
      order: "desc",
    });
  });

  it("maps underperformers to low-end removal focus", () => {
    const preset = getMatrixPresetDefinition("underperformers");

    expect(preset.state).toMatchObject({
      categories: ["low_end"],
      actions: ["remove"],
      marginMax: 0.35,
      qtyMax: 20,
      sort: "unitsSold",
      order: "asc",
    });
  });
});
