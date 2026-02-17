import { loadOpenAiModel } from "./llm-provider";
import {
  plannerOutputSchema,
  type PlannerAction,
  type PlannerInput,
  type PlannerOutput,
} from "./planner-contracts";

type PlannerDecision = {
  output: PlannerOutput;
  source: "llm" | "fallback";
  warning?: string;
};

function fallbackAction(input: PlannerInput): PlannerAction {
  if (input.remainingBudget.steps <= 0 || input.remainingBudget.milliseconds <= 0) {
    return {
      type: "stop",
      reason: "No remaining execution budget.",
    };
  }

  const destructiveHints = ["delete", "remove", "destroy", "reset"];
  const safeInteractive = input.context.interactiveElements.find((item) => {
    if (!item.visible || !item.enabled) return false;
    const label = `${item.label} ${item.selectorHint}`.toLowerCase();
    return !destructiveHints.some((hint) => label.includes(hint));
  });

  if (safeInteractive) {
    return {
      type: "click",
      selector: safeInteractive.selectorHint,
    };
  }

  if (input.context.runtimeSignals.consoleErrors.length > 0) {
    return {
      type: "screenshot",
      name: `runtime-error-${Date.now()}`,
      fullPage: true,
    };
  }

  return {
    type: "stop",
    reason: "No safe interactive target discovered in context.",
  };
}

function buildPlannerPrompt(input: PlannerInput): string {
  return [
    "You are an autonomous QA exploration planner for a web app.",
    "Return only one safe next action that advances the mission objective.",
    "Never propose destructive actions.",
    `Mission: ${input.mission.title}`,
    `Mission objective: ${input.mission.objective}`,
    `Scenario objective: ${input.scenario.objective}`,
    `Current URL: ${input.context.url}`,
    `Page title: ${input.context.title}`,
    `Focus areas: ${input.mission.focusAreas.join(", ")}`,
    `Runtime console errors: ${input.context.runtimeSignals.consoleErrors.length}`,
    `Runtime network errors: ${input.context.runtimeSignals.networkErrors.length}`,
    `Remaining steps: ${input.remainingBudget.steps}`,
    `Remaining milliseconds: ${input.remainingBudget.milliseconds}`,
    "Available interactive elements:",
    ...input.context.interactiveElements
      .slice(0, 60)
      .map(
        (item, index) =>
          `${index + 1}. role=${item.role} label=${item.label} selector=${item.selectorHint} visible=${item.visible} enabled=${item.enabled}`,
      ),
  ].join("\n");
}

export async function planNextAction(input: PlannerInput): Promise<PlannerDecision> {
  try {
    const { openaiModel } = await loadOpenAiModel();
    const runtimeImport = Function(
      "moduleName",
      "return import(moduleName)",
    ) as (moduleName: string) => Promise<unknown>;
    const aiModule = (await runtimeImport("ai")) as {
      generateObject: (options: {
        model: unknown;
        schema: typeof plannerOutputSchema;
        prompt: string;
      }) => Promise<{ object: unknown }>;
    };

    if (typeof aiModule.generateObject !== "function") {
      throw new Error("AI SDK generateObject is unavailable");
    }

    const prompt = buildPlannerPrompt(input);
    const result = await aiModule.generateObject({
      model: openaiModel,
      schema: plannerOutputSchema,
      prompt,
    });

    const output = plannerOutputSchema.parse(result.object);
    return {
      output,
      source: "llm",
    };
  } catch (error) {
    const action = fallbackAction(input);
    return {
      output: {
        action,
        reason: "Fallback planner used because LLM planner was unavailable or invalid.",
        expectedOutcome: "Safe progression or explicit stop without destructive actions.",
        confidence: 0.35,
      },
      source: "fallback",
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}
