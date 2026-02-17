import { describe, expect, it } from "vitest";
import {
  buildQualityHints,
  buildRunCursor,
  normalizeRunStatusFilter,
  parseRunCursor,
  summarizeError,
} from "@/lib/etl/run-history";

describe("run-history helpers", () => {
  it("normalizes status filters from csv and repeated query values", () => {
    expect(normalizeRunStatusFilter(["failed,succeeded", "running", "failed"])).toEqual([
      "failed",
      "succeeded",
      "running",
    ]);
  });

  it("builds and parses cursor deterministically", () => {
    const createdAt = new Date("2026-02-17T08:12:34.000Z");
    const cursor = buildRunCursor(createdAt, "job_abc123");
    expect(parseRunCursor(cursor)).toEqual({
      createdAt,
      id: "job_abc123",
    });
  });

  it("summarizes error using first non-empty line", () => {
    expect(summarizeError("\nfirst line\nsecond line")).toBe("first line");
  });

  it("returns quality hints for failed operation without pipeline run id", () => {
    expect(
      buildQualityHints({
        sourceFile: "operation:retry|pipelineRunId=123",
        pipelineRunId: null,
        status: "failed",
        startedAt: null,
        finishedAt: null,
      }),
    ).toEqual(["operation_trigger", "missing_pipeline_run_id", "failure_needs_recovery"]);
  });
});
