import { describe, expect, it } from "vitest";
import { plannerInputSchema, plannerOutputSchema } from "@/e2e/ai-explorer/planner-contracts";

describe("planner contracts", () => {
  it("accepts valid planner input", () => {
    const parsed = plannerInputSchema.parse({
      mission: {
        id: "mission-1",
        title: "Autonomous exploration",
        objective: "Explore route and find issues",
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
        id: "scenario-1",
        name: "Sales overview",
        route: "/analytics/sales",
        objective: "Find UX dead ends",
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
        steps: 10,
        milliseconds: 30_000,
      },
    });

    expect(parsed.scenario.route).toBe("/analytics/sales");
  });

  it("rejects unsafe/unknown planner action types", () => {
    expect(() =>
      plannerOutputSchema.parse({
        action: {
          type: "delete",
          selector: "button[data-danger]",
        },
        reason: "Try deleting",
        expectedOutcome: "Dangerous state change",
        confidence: 0.9,
      }),
    ).toThrow();
  });
});
