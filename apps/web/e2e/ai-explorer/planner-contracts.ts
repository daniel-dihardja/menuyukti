import { z } from "zod";
import { focusAreaSchema, missionGuardrailsSchema } from "./contracts";

export const plannerActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("goto"),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("click"),
    selector: z.string().min(1),
  }),
  z.object({
    type: z.literal("fill"),
    selector: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    type: z.literal("press"),
    key: z.string().min(1),
  }),
  z.object({
    type: z.literal("waitFor"),
    selector: z.string().min(1),
  }),
  z.object({
    type: z.literal("screenshot"),
    name: z.string().min(1),
    fullPage: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("note"),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("stop"),
    reason: z.string().min(1),
  }),
]);

export type PlannerAction = z.infer<typeof plannerActionSchema>;

export const plannerContextSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  screenshotPath: z.string().nullable(),
  interactiveElements: z.array(
    z.object({
      role: z.string(),
      label: z.string(),
      selectorHint: z.string(),
      visible: z.boolean(),
      enabled: z.boolean(),
    }),
  ),
  formControls: z.array(
    z.object({
      name: z.string(),
      selectorHint: z.string(),
      type: z.string(),
      valuePreview: z.string().nullable(),
      required: z.boolean(),
    }),
  ),
  runtimeSignals: z.object({
    consoleErrors: z.array(z.string()),
    networkErrors: z.array(z.string()),
  }),
});

export type PlannerContext = z.infer<typeof plannerContextSchema>;

export const plannerHistoryStepSchema = z.object({
  action: plannerActionSchema,
  result: z.enum(["ok", "failed", "blocked"]),
  note: z.string().nullable(),
  at: z.string(),
});

export const plannerInputSchema = z.object({
  mission: z.object({
    id: z.string(),
    title: z.string(),
    objective: z.string(),
    persona: z.enum(["marketer", "analyst", "operator", "mixed"]),
    focusAreas: z.array(focusAreaSchema).min(1),
    guardrails: missionGuardrailsSchema,
  }),
  scenario: z.object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    objective: z.string(),
  }),
  context: plannerContextSchema,
  history: z.array(plannerHistoryStepSchema),
  remainingBudget: z.object({
    steps: z.number().int().min(0),
    milliseconds: z.number().int().min(0),
  }),
});

export type PlannerInput = z.infer<typeof plannerInputSchema>;

export const plannerOutputSchema = z.object({
  action: plannerActionSchema,
  reason: z.string().min(1),
  expectedOutcome: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;
