import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAIR_FILTER_STATE,
  parsePairFilterState,
  serializePairFilterState,
} from "@/lib/analytics/pair-filter-state";

describe("parsePairFilterState", () => {
  it("parses valid params including pairType", () => {
    const state = parsePairFilterState(
      new URLSearchParams({
        q: "tea",
        pairType: "food_drink",
        minSampleSize: "10",
        minLift: "1.2",
        minConfidence: "0.2",
        limit: "150",
        sort: "lift",
        order: "asc",
      }),
    );

    expect(state).toEqual({
      q: "tea",
      pairType: "food_drink",
      minSampleSize: 10,
      minLift: 1.2,
      minConfidence: 0.2,
      limit: 150,
      sort: "lift",
      order: "asc",
    });
  });

  it("falls back to defaults for invalid pairType and values", () => {
    const state = parsePairFilterState({
      q: " ",
      pairType: "bad-type",
      minSampleSize: "-10",
      minLift: "bad",
      minConfidence: "2",
      limit: "0",
      sort: "bad",
      order: "bad",
    });

    expect(state).toEqual({
      ...DEFAULT_PAIR_FILTER_STATE,
      minSampleSize: 1,
      minConfidence: 1,
      limit: 10,
    });
  });
});

describe("serializePairFilterState", () => {
  it("round-trips including pairType", () => {
    const serialized = serializePairFilterState({
      ...DEFAULT_PAIR_FILTER_STATE,
      q: "combo",
      pairType: "drink_drink",
      minSampleSize: 8,
      minLift: 1.5,
      minConfidence: 0.3,
      limit: 200,
      sort: "pairOrders",
      order: "asc",
    });

    expect(parsePairFilterState(serialized)).toEqual({
      q: "combo",
      pairType: "drink_drink",
      minSampleSize: 8,
      minLift: 1.5,
      minConfidence: 0.3,
      limit: 200,
      sort: "pairOrders",
      order: "asc",
    });
  });
});
