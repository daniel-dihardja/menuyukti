import { describe, expect, it } from "vitest";
import type { AgentOutput } from "@prisma/client";
import { toAgentRunHistoryRecord } from "@/lib/agents/agent-run-history";

function makeRow(partial: Partial<AgentOutput>): AgentOutput {
  return {
    id: 1,
    agentId: "profit-intelligence-reranked",
    locationId: 1,
    analyticsId: 2,
    outputs: {},
    contractVersion: "v1",
    runId: "run_123",
    modelName: "model-x",
    runStatus: "accepted",
    inputHash: null,
    outputHash: null,
    tokenUsageJson: null,
    outputEnvelopeJson: {
      contract: { readiness: "ready", confidence: "high" },
      reranked: { fallback_to_baseline: true },
    },
    createdAt: new Date("2026-02-18T00:00:00.000Z"),
    updatedAt: new Date("2026-02-18T01:00:00.000Z"),
    ...partial,
  };
}

describe("agent-run-history mapper", () => {
  it("maps output envelope fields and fallback indicator", () => {
    const record = toAgentRunHistoryRecord(makeRow({}));
    expect(record.readiness).toBe("ready");
    expect(record.confidence).toBe("high");
    expect(record.fallbackUsed).toBe(true);
    expect(record.promptVersion).toBeTruthy();
  });

  it("handles missing contract fields safely", () => {
    const record = toAgentRunHistoryRecord(
      makeRow({
        outputEnvelopeJson: {},
        runStatus: null,
      }),
    );
    expect(record.readiness).toBeNull();
    expect(record.confidence).toBeNull();
    expect(record.runStatus).toBe("unknown");
  });
});
