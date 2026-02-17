import { describe, expect, it } from "vitest";
import {
  evaluateSalesActionReadiness,
  evaluateSalesDropdownReadiness,
} from "@/lib/analytics/sales-dropdown-readiness";

describe("sales dropdown readiness", () => {
  it("marks core-derived actions as needs_cogs when COGS is missing", () => {
    const signals = {
      hasCoreData: true,
      hasCogsData: false,
      hasAttributionData: true,
    };

    expect(evaluateSalesActionReadiness("matrix", signals).status).toBe("needs_cogs");
    expect(evaluateSalesActionReadiness("heatmap", signals).status).toBe("needs_cogs");
    expect(evaluateSalesActionReadiness("pairs", signals).status).toBe("needs_cogs");
    expect(evaluateSalesActionReadiness("finance", signals).status).toBe("needs_cogs");
  });

  it("marks matrix/heatmap/pairs/finance as ready when COGS is present", () => {
    const signals = {
      hasCoreData: true,
      hasCogsData: true,
      hasAttributionData: true,
    };

    const readiness = evaluateSalesDropdownReadiness(signals);

    expect(readiness.matrix.status).toBe("ready");
    expect(readiness.heatmap.status).toBe("ready");
    expect(readiness.pairs.status).toBe("ready");
    expect(readiness.finance.status).toBe("ready");
  });

  it("marks scheduler and attribution as needs_attribution_data when attribution is missing", () => {
    const signals = {
      hasCoreData: true,
      hasCogsData: true,
      hasAttributionData: false,
    };

    const readiness = evaluateSalesDropdownReadiness(signals);

    expect(readiness.scheduler.status).toBe("needs_attribution_data");
    expect(readiness.attribution.status).toBe("needs_attribution_data");
  });

  it("marks scheduler and attribution as ready when attribution exists", () => {
    const signals = {
      hasCoreData: true,
      hasCogsData: true,
      hasAttributionData: true,
    };

    const readiness = evaluateSalesDropdownReadiness(signals);

    expect(readiness.scheduler.status).toBe("ready");
    expect(readiness.attribution.status).toBe("ready");
  });
});
