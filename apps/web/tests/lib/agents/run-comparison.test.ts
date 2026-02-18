import { describe, expect, it } from "vitest";
import { buildRunComparisonRows, type SessionRunSnapshot } from "@/app/(protected)/agents/[agentId]/run-comparison";

function snapshot(partial: Partial<SessionRunSnapshot>): SessionRunSnapshot {
  return {
    id: "run-a",
    timestamp: "2026-02-18T00:00:00.000Z",
    status: "accepted",
    readiness: "ready",
    confidence: "high",
    fallbackUsed: false,
    guardrailState: "ready",
    fields: [{ label: "action", value: "accepted" }],
    ...partial,
  };
}

describe("buildRunComparisonRows", () => {
  it("marks trust and key-field differences", () => {
    const rows = buildRunComparisonRows(
      snapshot({ id: "a", fields: [{ label: "action", value: "accepted" }] }),
      snapshot({
        id: "b",
        status: "degraded",
        readiness: "degraded",
        confidence: "medium",
        fields: [{ label: "action", value: "rejected" }],
      }),
    );
    const actionRow = rows.find((row) => row.label === "action");
    expect(actionRow?.changed).toBe(true);
    const readinessRow = rows.find((row) => row.label === "readiness");
    expect(readinessRow?.changed).toBe(true);
  });
});
