import { describe, expect, it } from "vitest";
import { planNextAction } from "@/e2e/ai-explorer/planner";
import type { PlannerInput } from "@/e2e/ai-explorer/planner-contracts";

function buildInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  const base: PlannerInput = {
    mission: {
      id: "m1",
      title: "Mission",
      objective: "Explore",
      persona: "mixed",
      focusAreas: ["navigation"],
      guardrails: {
        maxSteps: 20,
        stepTimeoutMs: 10_000,
        maxDurationMs: 120_000,
        allowDestructiveActions: false,
        allowedDomains: ["127.0.0.1"],
      },
    },
    scenario: {
      id: "s1",
      name: "Scenario",
      route: "/analytics/sales",
      objective: "Open core interactions",
    },
    context: {
      url: "http://127.0.0.1:3000/analytics/sales",
      title: "Sales",
      screenshotPath: null,
      interactiveElements: [],
      formControls: [],
      runtimeSignals: {
        consoleErrors: [],
        networkErrors: [],
      },
    },
    history: [],
    remainingBudget: {
      steps: 5,
      milliseconds: 30_000,
    },
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("planNextAction", () => {
  it("uses fallback stop when no safe targets are available", async () => {
    const decision = await planNextAction(buildInput());
    expect(decision.source).toBe("fallback");
    expect(decision.output.action.type).toBe("stop");
  });

  it("uses fallback click when safe interactive element exists", async () => {
    const decision = await planNextAction(
      buildInput({
        context: {
          url: "http://127.0.0.1:3000/analytics/sales",
          title: "Sales",
          screenshotPath: null,
          interactiveElements: [
            {
              role: "button",
              label: "Open Filters",
              selectorHint: "#open-filters",
              visible: true,
              enabled: true,
            },
          ],
          formControls: [],
          runtimeSignals: {
            consoleErrors: [],
            networkErrors: [],
          },
        },
      }),
    );

    expect(decision.output.action.type).toBe("click");
    if (decision.output.action.type === "click") {
      expect(decision.output.action.selector).toBe("#open-filters");
    }
  });
});
