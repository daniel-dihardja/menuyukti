import { describe, expect, it } from "vitest";

import { evaluateAgentReleaseGate } from "@/lib/agents/release-gate";

describe("agent release gate evaluation", () => {
  it("passes when thresholds are satisfied", () => {
    const result = evaluateAgentReleaseGate([
      {
        workflowId: "strategist",
        readiness: "ready",
        confidence: "high",
        evidenceCount: 3,
        contractValid: true,
        statusCode: 200,
      },
      {
        workflowId: "profit_intelligence",
        readiness: "degraded",
        confidence: "medium",
        evidenceCount: 2,
        contractValid: true,
        statusCode: 200,
      },
      {
        workflowId: "consensus",
        readiness: "ready",
        confidence: "high",
        evidenceCount: 2,
        contractValid: true,
        statusCode: 200,
      },
      {
        workflowId: "simulation",
        readiness: "ready",
        confidence: "high",
        evidenceCount: 2,
        contractValid: true,
        statusCode: 200,
      },
    ]);

    expect(result.pass).toBe(true);
    expect(result.summary.totalWorkflows).toBe(4);
  });

  it("fails when blocked workflows exceed threshold", () => {
    const result = evaluateAgentReleaseGate([
      {
        workflowId: "strategist",
        readiness: "blocked",
        confidence: "blocked",
        evidenceCount: 1,
        contractValid: true,
        statusCode: 200,
      },
      {
        workflowId: "profit_intelligence",
        readiness: "ready",
        confidence: "high",
        evidenceCount: 3,
        contractValid: true,
        statusCode: 200,
      },
      {
        workflowId: "consensus",
        readiness: "ready",
        confidence: "high",
        evidenceCount: 3,
        contractValid: true,
        statusCode: 200,
      },
      {
        workflowId: "simulation",
        readiness: "ready",
        confidence: "high",
        evidenceCount: 3,
        contractValid: true,
        statusCode: 200,
      },
    ]);

    expect(result.pass).toBe(false);
    expect(result.checks.blockedWithinLimit).toBe(false);
  });
});
