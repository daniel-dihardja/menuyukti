import { describe, expect, it } from "vitest";
import { pairTypeLabel, parsePairTypeFilter } from "@/lib/analytics/pair-type";

describe("parsePairTypeFilter", () => {
  it("accepts supported pair type filters", () => {
    expect(parsePairTypeFilter("all")).toBe("all");
    expect(parsePairTypeFilter("food_drink")).toBe("food_drink");
    expect(parsePairTypeFilter("food_food")).toBe("food_food");
    expect(parsePairTypeFilter("drink_drink")).toBe("drink_drink");
    expect(parsePairTypeFilter("unknown")).toBe("unknown");
  });

  it("falls back to all for invalid or empty values", () => {
    expect(parsePairTypeFilter(null)).toBe("all");
    expect(parsePairTypeFilter(undefined)).toBe("all");
    expect(parsePairTypeFilter("invalid")).toBe("all");
  });
});

describe("pairTypeLabel", () => {
  it("returns stable UI labels for each pair type", () => {
    expect(pairTypeLabel("food_drink")).toBe("Food + Drink");
    expect(pairTypeLabel("food_food")).toBe("Food + Food");
    expect(pairTypeLabel("drink_drink")).toBe("Drink + Drink");
    expect(pairTypeLabel("unknown")).toBe("Unknown");
  });
});
