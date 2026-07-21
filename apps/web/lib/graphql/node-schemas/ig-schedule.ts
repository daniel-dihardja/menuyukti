/**
 * Shared staged IG week-schedule schemas (plan → menu → format → text).
 * Progressive entry enrichment: each stage extends the prior with required fields.
 */

import { z } from 'zod'

export type IgScheduleStage = 'plan' | 'menu' | 'format' | 'text'

export const igPlanWeekdaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

export const igPlanPillarSchema = z.enum([
  'hero',
  'reminder',
  'lifestyle',
  'community',
  'social_proof',
  'educational',
  'product_discovery',
])

export const igPlanProductRoleSchema = z.enum(['star', 'puzzle', 'plow_horse'])

export const igPlanSlotStrategySchema = z.enum(['maintain', 'support', 'grow', 'aggressively_grow'])

export const igPlanEntrySchema = z.object({
  day: igPlanWeekdaySchema,
  slot: z.string().regex(/^\d{2}:\d{2}$/),
  objective: z.string().trim().min(1),
  pillar: igPlanPillarSchema,
  mealPeriod: z.string().trim().min(1),
  productRole: igPlanProductRoleSchema,
  slotStrategy: igPlanSlotStrategySchema,
  slotKey: z.string().trim().min(1),
})

export type IgPlanEntry = z.infer<typeof igPlanEntrySchema>

export const igPlanMilestoneDataSchema = z.object({
  scheduleExplanation: z.string().default(''),
  entries: z.array(igPlanEntrySchema).default([]),
  sourceAnalyticsRunId: z.string().trim().default(''),
  reportingPeriod: z.string().trim().default(''),
})

export type IgPlanMilestoneData = z.infer<typeof igPlanMilestoneDataSchema>

export const igMenuPickerMenuItemSchema = z.object({
  menu: z.string().trim().min(1),
  rationale: z.string().trim().default(''),
})

export type IgMenuPickerMenuItem = z.infer<typeof igMenuPickerMenuItemSchema>

export const igMenuPickerEntrySchema = igPlanEntrySchema.extend({
  menuItems: z.array(igMenuPickerMenuItemSchema).min(1).max(3),
})

export type IgMenuPickerEntry = z.infer<typeof igMenuPickerEntrySchema>

export const igMenuPickerMilestoneDataSchema = z.object({
  scheduleExplanation: z.string().default(''),
  entries: z.array(igMenuPickerEntrySchema).default([]),
  sourceAnalyticsRunId: z.string().trim().default(''),
  reportingPeriod: z.string().trim().default(''),
  sourceIgPlanTitle: z.string().trim().optional(),
})

export type IgMenuPickerMilestoneData = z.infer<typeof igMenuPickerMilestoneDataSchema>

export const igFormatTypeSchema = z.enum(['reel', 'post', 'post-carousel', 'story'])

export type IgFormatType = z.infer<typeof igFormatTypeSchema>

export const igFormatEntrySchema = igMenuPickerEntrySchema.extend({
  type: igFormatTypeSchema,
  formatRationale: z.string().trim().default(''),
})

export type IgFormatEntry = z.infer<typeof igFormatEntrySchema>

export const igFormatMilestoneDataSchema = z.object({
  scheduleExplanation: z.string().default(''),
  entries: z.array(igFormatEntrySchema).default([]),
  sourceAnalyticsRunId: z.string().trim().default(''),
  reportingPeriod: z.string().trim().default(''),
  sourceIgMenuPickerTitle: z.string().trim().optional(),
})

export type IgFormatMilestoneData = z.infer<typeof igFormatMilestoneDataSchema>

export const igTextFieldSchema = z.object({
  field: z.string().trim().min(1),
  value: z.string().trim().min(1),
})

export type IgTextField = z.infer<typeof igTextFieldSchema>

export const igTextEntrySchema = igFormatEntrySchema.extend({
  texts: z.array(igTextFieldSchema).min(1),
})

export type IgTextEntry = z.infer<typeof igTextEntrySchema>

export const igTextMilestoneDataSchema = z.object({
  scheduleExplanation: z.string().default(''),
  entries: z.array(igTextEntrySchema).default([]),
  sourceAnalyticsRunId: z.string().trim().default(''),
  reportingPeriod: z.string().trim().default(''),
  sourceIgFormatTitle: z.string().trim().optional(),
  sourceCampaignBriefTitle: z.string().trim().optional(),
})

export type IgTextMilestoneData = z.infer<typeof igTextMilestoneDataSchema>

const ENTRY_SCHEMA_BY_STAGE = {
  plan: igPlanEntrySchema,
  menu: igMenuPickerEntrySchema,
  format: igFormatEntrySchema,
  text: igTextEntrySchema,
} as const

/**
 * Parse `entries` from a schedule-like payload at a given enrichment stage.
 * Invalid rows are skipped (same behavior as prior-entry helpers).
 */
export function parseIgScheduleEntries(
  data: unknown,
  stage: IgScheduleStage,
): IgPlanEntry[] | IgMenuPickerEntry[] | IgFormatEntry[] | IgTextEntry[] {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return []
  }
  const rawEntries = (data as { entries?: unknown }).entries
  if (!Array.isArray(rawEntries)) {
    return []
  }
  const schema = ENTRY_SCHEMA_BY_STAGE[stage]
  const entries: z.infer<typeof schema>[] = []
  for (const raw of rawEntries) {
    const row = schema.safeParse(raw)
    if (row.success) {
      entries.push(row.data)
    }
  }
  return entries
}
