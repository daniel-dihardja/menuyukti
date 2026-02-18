import { applySampleContext, resolveSampleContext } from "@/app/(protected)/agents/[agentId]/sample-context";
import { describe, expect, it } from "vitest";

describe("sample context helper", () => {
  it("falls back to deterministic sample ids when context is missing", () => {
    const sample = resolveSampleContext({ locationId: null, analyticsId: null });
    expect(sample.locationId).toBe(1);
    expect(sample.analyticsId).toBe(1);
  });

  it("preserves current context when available", () => {
    const sample = resolveSampleContext({ locationId: 8, analyticsId: 42 });
    expect(sample.locationId).toBe(8);
    expect(sample.analyticsId).toBe(42);
  });

  it("applies deterministic sample context to setters", () => {
    let location: number | null = null;
    let analytics: number | null = null;
    const result = applySampleContext({
      setLocationId: (value) => {
        location = value;
      },
      setAnalyticsId: (value) => {
        analytics = value;
      },
    });

    expect(result.locationId).toBe(1);
    expect(result.analyticsId).toBe(1);
    expect(location).toBe(1);
    expect(analytics).toBe(1);
  });
});

