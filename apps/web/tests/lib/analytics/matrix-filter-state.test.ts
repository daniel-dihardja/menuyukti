import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATRIX_FILTER_STATE,
  parseMatrixFilterState,
  serializeMatrixFilterState,
} from "@/lib/analytics/matrix-filter-state";

describe("parseMatrixFilterState", () => {
  it("parses valid query params with csv lists", () => {
    const state = parseMatrixFilterState(
      new URLSearchParams({
        q: "nasi",
        categories: "star,puzzle",
        actions: "promote,reprice",
        marginMin: "0.2",
        marginMax: "0.8",
        qtyMin: "10",
        qtyMax: "50",
        sort: "revenue",
        order: "asc",
      }),
    );

    expect(state).toEqual({
      q: "nasi",
      categories: ["star", "puzzle"],
      actions: ["promote", "reprice"],
      marginMin: 0.2,
      marginMax: 0.8,
      qtyMin: 10,
      qtyMax: 50,
      sort: "revenue",
      order: "asc",
    });
  });

  it("sanitizes invalid params and falls back to defaults", () => {
    const state = parseMatrixFilterState({
      q: " ",
      categories: "star,invalid",
      actions: "bad,remove",
      marginMin: "abc",
      marginMax: "1.1",
      qtyMin: "70",
      qtyMax: "20",
      sort: "unknown",
      order: "down",
    });

    expect(state).toEqual({
      q: "",
      categories: ["star"],
      actions: ["remove"],
      marginMin: null,
      marginMax: 1.1,
      qtyMin: 20,
      qtyMax: 70,
      sort: DEFAULT_MATRIX_FILTER_STATE.sort,
      order: DEFAULT_MATRIX_FILTER_STATE.order,
    });
  });
});

describe("serializeMatrixFilterState", () => {
  it("round-trips parsed state through URL serialization", () => {
    const input = {
      q: "mie",
      categories: ["low_end", "plow_horse"] as const,
      actions: ["keep"] as const,
      marginMin: 0.15,
      marginMax: 0.75,
      qtyMin: 1,
      qtyMax: 99,
      sort: "marginPct" as const,
      order: "asc" as const,
    };

    const serialized = serializeMatrixFilterState({
      ...DEFAULT_MATRIX_FILTER_STATE,
      ...input,
      categories: [...input.categories],
      actions: [...input.actions],
    });
    const reparsed = parseMatrixFilterState(serialized);

    expect(reparsed).toEqual({
      ...DEFAULT_MATRIX_FILTER_STATE,
      ...input,
      categories: [...input.categories],
      actions: [...input.actions],
    });
  });
});
