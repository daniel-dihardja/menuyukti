import { z } from "zod";

export const severitySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export type Severity = z.infer<typeof severitySchema>;

export const focusAreaSchema = z.enum([
  "navigation",
  "runtime_errors",
  "data_visibility",
  "ux_clarity",
  "layout_overflow",
  "accessibility_basics",
]);
export type FocusArea = z.infer<typeof focusAreaSchema>;

export const missionGuardrailsSchema = z.object({
  maxSteps: z.number().int().min(1).max(300).default(120),
  stepTimeoutMs: z.number().int().min(250).max(120_000).default(10_000),
  maxDurationMs: z.number().int().min(1_000).max(3_600_000).default(300_000),
  allowDestructiveActions: z.boolean().default(false),
  allowedDomains: z.array(z.string().min(1)).default(["127.0.0.1", "localhost"]),
});
export type MissionGuardrails = z.infer<typeof missionGuardrailsSchema>;

export const missionActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("goto"), url: z.string().url() }),
  z.object({ type: z.literal("click"), selector: z.string().min(1) }),
  z.object({ type: z.literal("fill"), selector: z.string().min(1), value: z.string() }),
  z.object({ type: z.literal("press"), key: z.string().min(1) }),
  z.object({ type: z.literal("waitFor"), selector: z.string().min(1) }),
  z.object({ type: z.literal("screenshot"), name: z.string().min(1), fullPage: z.boolean().optional() }),
  z.object({ type: z.literal("note"), text: z.string().min(1) }),
]);
export type MissionAction = z.infer<typeof missionActionSchema>;

export const missionScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().min(1),
  objective: z.string().min(1),
  actions: z.array(missionActionSchema).min(1),
});
export type MissionScenario = z.infer<typeof missionScenarioSchema>;

export const missionSchema = z.object({
  schemaVersion: z.literal("v1"),
  id: z.string().min(1),
  title: z.string().min(1),
  baseUrl: z.string().url(),
  persona: z.enum(["marketer", "analyst", "operator", "mixed"]).default("mixed"),
  focusAreas: z.array(focusAreaSchema).min(1),
  guardrails: missionGuardrailsSchema,
  scenarios: z.array(missionScenarioSchema).min(1),
});
export type Mission = z.infer<typeof missionSchema>;

export const findingSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1),
  scenarioId: z.string().min(1),
  severity: severitySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  route: z.string().min(1),
  reproducibleSteps: z.array(z.string().min(1)).min(1),
  evidence: z.object({
    screenshots: z.array(z.string()),
    consoleErrors: z.array(z.string()),
    networkErrors: z.array(z.string()),
  }),
  confidence: z.number().min(0).max(1),
  suggestedFix: z.string().nullable(),
});
export type Finding = z.infer<typeof findingSchema>;

export const findingsReportSchema = z.object({
  schemaVersion: z.literal("v1"),
  runId: z.string().min(1),
  generatedAt: z.string().min(1),
  mission: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
  }),
  findings: z.array(findingSchema),
  summary: z.object({
    total: z.number().int().min(0),
    bySeverity: z.record(severitySchema, z.number().int().min(0)),
  }),
});
export type FindingsReport = z.infer<typeof findingsReportSchema>;
