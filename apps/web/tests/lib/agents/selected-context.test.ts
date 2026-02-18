import { describe, expect, it } from "vitest";
import { resolveSelectedContextState } from "@/app/(protected)/agents/[agentId]/selected-context";

describe("resolveSelectedContextState", () => {
  it("returns blocked when both ids are missing", () => {
    const state = resolveSelectedContextState({ locationId: null, analyticsId: null });
    expect(state.status).toBe("blocked");
    expect(state.canRun).toBe(false);
  });

  it("returns degraded when location exists but analytics is missing", () => {
    const state = resolveSelectedContextState({ locationId: 1, analyticsId: null });
    expect(state.status).toBe("degraded");
    expect(state.canRun).toBe(false);
  });

  it("returns ready when both ids exist", () => {
    const state = resolveSelectedContextState({ locationId: 1, analyticsId: 2 });
    expect(state.status).toBe("ready");
    expect(state.canRun).toBe(true);
  });
});
