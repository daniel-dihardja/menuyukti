import { describe, expect, it } from "vitest";
import {
  DEFAULT_ATTRIBUTION_CURRENCY,
  resolveAttributionCurrencyCode,
} from "@/lib/analytics/attribution-currency";

describe("resolveAttributionCurrencyCode", () => {
  it("returns normalized currency code when provided", () => {
    expect(resolveAttributionCurrencyCode("usd")).toBe("USD");
    expect(resolveAttributionCurrencyCode(" idr ")).toBe("IDR");
  });

  it("falls back to default currency when missing", () => {
    expect(resolveAttributionCurrencyCode(null)).toBe(DEFAULT_ATTRIBUTION_CURRENCY);
    expect(resolveAttributionCurrencyCode(undefined)).toBe(DEFAULT_ATTRIBUTION_CURRENCY);
    expect(resolveAttributionCurrencyCode("")).toBe(DEFAULT_ATTRIBUTION_CURRENCY);
    expect(resolveAttributionCurrencyCode("   ")).toBe(DEFAULT_ATTRIBUTION_CURRENCY);
  });
});
