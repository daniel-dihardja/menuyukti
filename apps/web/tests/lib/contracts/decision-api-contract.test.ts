import {
  createDecisionApiContract,
  createDecisionContext,
  mapAgentReadinessToTrust,
  mapSchedulerGuardrailToTrust,
} from "@/lib/contracts/decision-api-contract";
import { describe, expect, it } from "vitest";

describe("decision-api-contract", () => {
  it("builds ready contract from passed trust", () => {
    const context = createDecisionContext({
      persona: "analyst",
      locationId: 7,
      analyticsId: 12,
      trust: {
        qualityStatus: "passed",
        freshnessMinutes: 15,
        isStale: false,
        reasons: [],
      },
    });

    const contract = createDecisionApiContract({
      surface: "matrix",
      context,
      evidence: [
        {
          source: "warehouse",
          entity: "warehouse.dim_pipeline_run",
          metric: "pipeline_run_id",
          value: "run-1",
          key: { analyticsId: 12 },
        },
      ],
    });

    expect(contract.contractVersion).toBe("v1");
    expect(contract.readiness).toBe("ready");
    expect(contract.confidence).toBe("high");
    expect(contract.evidence).toHaveLength(1);
  });

  it("maps warn/stale trust to degraded readiness", () => {
    const trust = mapSchedulerGuardrailToTrust({
      readiness: "degraded",
      qualityStatus: "warn",
      freshnessMinutes: 1800,
      isStale: true,
      reasons: ["freshness_stale"],
    });
    const context = createDecisionContext({
      persona: "marketer",
      trust,
    });

    const contract = createDecisionApiContract({
      surface: "scheduler",
      context,
    });

    expect(contract.readiness).toBe("degraded");
    expect(contract.confidence).toBe("medium");
    expect(contract.context.trust.reasons).toContain("freshness_stale");
  });

  it("maps blocked agent readiness to blocked contract", () => {
    const trust = mapAgentReadinessToTrust({
      level: "blocked",
      reasonCode: "QUALITY_FAILED",
      qualityStatus: "failed",
      freshnessMinutes: 22,
    });
    const context = createDecisionContext({
      persona: "marketer",
      locationId: 4,
      analyticsId: 99,
      trust,
    });
    const contract = createDecisionApiContract({
      surface: "agent:marketer-strategist",
      context,
    });

    expect(contract.readiness).toBe("blocked");
    expect(contract.confidence).toBe("blocked");
    expect(contract.context.trust.qualityStatus).toBe("failed");
    expect(contract.context.trust.reasons).toContain("quality_failed");
  });
});
