/**
 * Zod schemas for milestone preset payloads.
 */

import { z } from 'zod'

import {
  MENU_TAGGER_TAXONOMY_VERSION,
  computeMenuTaggerUsedTags,
  menuTaggerCourseSchema,
  menuTaggerIngredientSchema,
  menuTaggerKindSchema,
  menuTaggerTagsSchema,
  menuTaggerTasteSchema,
  menuTaggerUsedTagsSchema,
} from '@/lib/milestones/menu-tagger-taxonomy'

export const passCriteriaSchema = z.object({
  id: z.string().trim().min(1),
  requirement: z.string(),
  status: z.enum(['pass', 'fail', 'open']),
})

export type PassCriteriaData = z.infer<typeof passCriteriaSchema>

export const milestonePresetIdSchema = z.enum([
  'dates',
  'restaurant_campaign_brief',
  'promotion_candidates',
  'menu_tagger',
  'menu_clusterer',
  'culture_hooks',
  'ig_profile',
  'ig_plan',
  'ig_menu_picker',
  'ig_format',
  'ig_text',
  'scheduler',
])

export type MilestonePresetId = z.infer<typeof milestonePresetIdSchema>

/** Ordered preset ids — single source for UI lists and guards. */
export const MILESTONE_PRESET_IDS = milestonePresetIdSchema.options

/** Map a stored preset id to a current `MilestonePresetId`. */
export function normalizeMilestonePresetId(value: unknown): MilestonePresetId | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  if ((MILESTONE_PRESET_IDS as readonly string[]).includes(value)) {
    return value as MilestonePresetId
  }
  return undefined
}

/** Zod field that accepts current + legacy preset ids and normalizes to the current id. */
export const milestonePresetIdFieldSchema = z.preprocess(
  (value) => normalizeMilestonePresetId(value) ?? value,
  milestonePresetIdSchema.optional(),
)

/**
 * Optional owner notes on the milestone Input tab (`value.notes`).
 * Campaign dates live on the separate `dates` milestone, not here.
 */
export const campaignBriefReflectionInputSchema = z.object({
  enabled: z.boolean(),
  maxRevisions: z.number().int().min(0).max(3),
})

export type CampaignBriefReflectionInput = z.infer<typeof campaignBriefReflectionInputSchema>

/** Optional explicit upstream milestone bindings (Input tab dependency selects). */
const milestoneDependencyIdFieldsSchema = z.object({
  sourceCampaignBriefMilestoneId: z.string().trim().min(1).optional(),
  sourcePromotionCandidatesMilestoneId: z.string().trim().min(1).optional(),
  sourceMenuTaggerMilestoneId: z.string().trim().min(1).optional(),
  sourceIgPlanMilestoneId: z.string().trim().min(1).optional(),
  sourceIgMenuPickerMilestoneId: z.string().trim().min(1).optional(),
  sourceIgFormatMilestoneId: z.string().trim().min(1).optional(),
  sourceDatesMilestoneId: z.string().trim().min(1).optional(),
})

export const campaignBriefMilestoneInputValueSchema = z.object({
  notes: z.string(),
  reflection: campaignBriefReflectionInputSchema.optional(),
})

export type CampaignBriefMilestoneInputValue = z.infer<
  typeof campaignBriefMilestoneInputValueSchema
>

export const cultureHooksMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type CultureHooksMilestoneInputValue = z.infer<typeof cultureHooksMilestoneInputValueSchema>

export const igProfileMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type IgProfileMilestoneInputValue = z.infer<typeof igProfileMilestoneInputValueSchema>

export const igPlanMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type IgPlanMilestoneInputValue = z.infer<typeof igPlanMilestoneInputValueSchema>

export const menuTaggerMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type MenuTaggerMilestoneInputValue = z.infer<typeof menuTaggerMilestoneInputValueSchema>

export const MENU_CLUSTERER_MIN_GROUP_COUNT = 1
export const MENU_CLUSTERER_DEFAULT_GROUP_COUNT = 1
export const MENU_CLUSTERER_MAX_GROUP_COUNT = 20

export const MENU_CLUSTERER_DERIVED_MIN_GROUP_COUNT = 4

export const MENU_CLUSTERER_DERIVED_MAX_GROUP_COUNT = 12

/** LLM menu cluster count (milestone input + output targetGroupCount). */
export const menuClustererHookTargetGroupCountSchema = z
  .number()
  .int()
  .min(MENU_CLUSTERER_DERIVED_MIN_GROUP_COUNT)
  .max(MENU_CLUSTERER_DERIVED_MAX_GROUP_COUNT)

export type MenuClustererHookTargetGroupCount = z.infer<
  typeof menuClustererHookTargetGroupCountSchema
>

/** Per-category top_five group count on clusterer output (not the same as hook cluster count). */
export const menuClustererTopFiveGroupCountSchema = z.number().int().min(1).max(20)

export type MenuClustererTopFiveGroupCount = z.infer<typeof menuClustererTopFiveGroupCountSchema>

/** @deprecated Use menuClustererHookTargetGroupCountSchema for hook/menu cluster counts. */
export const menuClustererTargetGroupCountSchema = menuClustererHookTargetGroupCountSchema

export type MenuClustererTargetGroupCount = MenuClustererHookTargetGroupCount

export const menuClustererMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
    targetGroupCount: menuClustererHookTargetGroupCountSchema.optional(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type MenuClustererMilestoneInputValue = z.infer<
  typeof menuClustererMilestoneInputValueSchema
>

export const schedulerMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type SchedulerMilestoneInputValue = z.infer<typeof schedulerMilestoneInputValueSchema>

export const promotionCandidatesItemLimitSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal('all'),
])

export type PromotionCandidatesItemLimit = z.infer<typeof promotionCandidatesItemLimitSchema>

/** Promotion candidates Input tab: optional notes plus POS menu category filter (empty = all). */
export const promotionCandidatesMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
    selectedMenuCategories: z.array(z.string().trim().min(1)),
    ignoredMenuItems: z.array(z.string().trim().min(1)).default([]),
    starItemLimit: promotionCandidatesItemLimitSchema.default(5),
    puzzleItemLimit: promotionCandidatesItemLimitSchema.default(10),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type PromotionCandidatesMilestoneInputValue = z.infer<
  typeof promotionCandidatesMilestoneInputValueSchema
>

export const datesMilestoneInputValueSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
})

export type DatesMilestoneInputValue = z.infer<typeof datesMilestoneInputValueSchema>

export const milestoneInputSchema = z.object({
  type: z.string().trim().min(1),
  value: z.unknown().optional(),
})

export type MilestoneInput = z.infer<typeof milestoneInputSchema>

export const campaignWindowPublicHolidaySchema = z.object({
  name: z.string(),
  description: z.string(),
  date: z.string(),
})

export type CampaignWindowPublicHoliday = z.infer<typeof campaignWindowPublicHolidaySchema>

export const datesMilestoneDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  publicHolidays: z.array(campaignWindowPublicHolidaySchema),
})

export type DatesMilestoneData = z.infer<typeof datesMilestoneDataSchema>

export const campaignBriefVenueSnapshotSchema = z.object({
  venueName: z.string(),
  city: z.string(),
  country: z.string(),
  currency: z.string(),
})

export type CampaignBriefVenueSnapshot = z.infer<typeof campaignBriefVenueSnapshotSchema>

export const campaignBriefOverallStrategySchema = z.object({
  strategyFocus: z.string().trim().min(1),
  audiencePriority: z.array(z.string().trim().min(1)),
  coreMessage: z.string().trim().min(1),
  offerWindow: z.string().trim().min(1),
  cadenceGuidance: z.array(z.string().trim().min(1)),
})

export type CampaignBriefOverallStrategy = z.infer<typeof campaignBriefOverallStrategySchema>

export const campaignBriefMilestoneDataSchema = z.object({
  venueSnapshot: campaignBriefVenueSnapshotSchema,
  overallStrategy: campaignBriefOverallStrategySchema.optional(),
  contentPillars: z.array(z.string()),
  audienceHypotheses: z.array(z.string()),
  proofOrientedAngles: z.array(z.string()),
  toneGuardrails: z.array(z.string()),
  campaignObjective: z.string(),
  mainCategory: z.string().trim().min(1),
  targetSegments: z.array(z.string()),
  messageHierarchy: z.array(z.string()),
  offerAndCtaPlan: z.array(z.string()),
  contentPillarPlan: z.array(z.string()),
  measurementPlan: z.array(z.string()),
  testingPlan: z.array(z.string()),
  riskGuardrails: z.array(z.string()),
})

export type CampaignBriefMilestoneData = z.infer<typeof campaignBriefMilestoneDataSchema>

/** Legacy milestonedata stored star/puzzle lines as plain strings; new runs use objects with storytelling fields. */
export const promotionCandidateMenuItemSchema = z.union([
  z
    .string()
    .trim()
    .min(1)
    .transform((name) => ({
      name,
      storytellingFit: 'strong' as const,
      storytellingRationale: '',
      quantity: undefined,
      popularity: undefined,
    })),
  z.object({
    name: z.string().trim().min(1),
    storytellingFit: z.enum(['strong', 'weak']).default('weak'),
    storytellingRationale: z.string().default(''),
    quantity: z.number().int().nonnegative().optional(),
    popularity: z.number().min(0).max(1).optional(),
    priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
])

export const promotionCandidatesCategorySchema = z.object({
  category: z.string().trim().min(1),
  starItems: z.array(promotionCandidateMenuItemSchema),
  puzzleItems: z.array(promotionCandidateMenuItemSchema),
})

export const promotionCandidatesMilestoneDataSchema = z.object({
  mainCategory: z.string().trim().min(1),
  categories: z.array(promotionCandidatesCategorySchema).min(1),
  sourceAnalyticsRunId: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export type PromotionCandidateMenuItem = z.output<typeof promotionCandidateMenuItemSchema>

export type PromotionCandidatesMilestoneData = z.infer<
  typeof promotionCandidatesMilestoneDataSchema
>

export const cultureHookIntersectionSchema = z.object({
  topic: z.string(),
  conceptLink: z.string(),
  audienceRelevance: z.string(),
  contentExample: z.string(),
})

export const cultureHooksMilestoneDataSchema = z.object({
  locationConcept: z.string(),
  targetAudience: z.string(),
  intersections: z.array(cultureHookIntersectionSchema),
  guardrailCheck: z.string(),
})

export type CultureHooksMilestoneData = z.infer<typeof cultureHooksMilestoneDataSchema>

/** Permissive storage schema (empty seed on create). Run output is validated strictly in agents. */
export const igProfileUsernameSuggestionSchema = z.object({
  username: z.string(),
  rationale: z.string(),
})

export const igProfileBioSchema = z.object({
  text: z.string(),
  hook: z.string(),
  valueProp: z.string(),
  cta: z.string(),
  tone: z.string(),
})

export const igProfileMilestoneDataSchema = z
  .object({
    usernames: z.array(igProfileUsernameSuggestionSchema),
    bios: z.array(igProfileBioSchema).optional(),
    /** @deprecated Legacy single-bio shape — normalized to `bios` on parse. */
    bio: igProfileBioSchema.optional(),
  })
  .transform(({ usernames, bios, bio }) => ({
    usernames,
    bios: bios ?? (bio ? [bio] : []),
  }))

export type IgProfileMilestoneData = z.infer<typeof igProfileMilestoneDataSchema>

export {
  igPlanWeekdaySchema,
  igPlanPillarSchema,
  igPlanProductRoleSchema,
  igPlanSlotStrategySchema,
  igPlanEntrySchema,
  igPlanMilestoneDataSchema,
  igMenuPickerMenuItemSchema,
  igMenuPickerEntrySchema,
  igMenuPickerMilestoneDataSchema,
  igFormatTypeSchema,
  igFormatEntrySchema,
  igFormatMilestoneDataSchema,
  igTextFieldSchema,
  igTextEntrySchema,
  igTextMilestoneDataSchema,
  parseIgScheduleEntries,
  type IgScheduleStage,
  type IgPlanEntry,
  type IgPlanMilestoneData,
  type IgMenuPickerMenuItem,
  type IgMenuPickerEntry,
  type IgMenuPickerMilestoneData,
  type IgFormatType,
  type IgFormatEntry,
  type IgFormatMilestoneData,
  type IgTextField,
  type IgTextEntry,
  type IgTextMilestoneData,
} from './ig-schedule'

export const igMenuPickerMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
    selectedSlotKeys: z.array(z.string().trim().min(1)).default([]),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type IgMenuPickerMilestoneInputValue = z.infer<typeof igMenuPickerMilestoneInputValueSchema>

export const igFormatMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type IgFormatMilestoneInputValue = z.infer<typeof igFormatMilestoneInputValueSchema>

export const igTextMilestoneInputValueSchema = z
  .object({
    notes: z.string(),
  })
  .merge(milestoneDependencyIdFieldsSchema)

export type IgTextMilestoneInputValue = z.infer<typeof igTextMilestoneInputValueSchema>

export const menuTaggerItemRoleSchema = z.enum(['star', 'puzzle'])

export const menuTaggerItemSchema = z.object({
  name: z.string().trim().min(1),
  role: menuTaggerItemRoleSchema,
  category: z.string().trim().min(1),
  tags: menuTaggerTagsSchema,
  storytellingFit: z.enum(['strong', 'weak']).default('weak'),
  storytellingRationale: z.string().default(''),
  quantity: z.number().int().nonnegative().optional(),
  popularity: z.number().min(0).max(1).optional(),
})

export type MenuTaggerItem = z.infer<typeof menuTaggerItemSchema>

export const menuTaggerMilestoneDataSchema = z.object({
  taxonomyVersion: z.literal(MENU_TAGGER_TAXONOMY_VERSION),
  sourcePromotionCandidatesTitle: z.string().optional(),
  items: z.array(menuTaggerItemSchema),
  usedTags: menuTaggerUsedTagsSchema,
  notes: z.string().optional(),
})

export type MenuTaggerMilestoneData = z.infer<typeof menuTaggerMilestoneDataSchema>

export const menuClustererProfileIdSchema = z.enum(['hook_reel', 'menu_highlight', 'top_five'])

export const menuClustererAnchorSchema = z.object({
  dimension: z.literal('reel_moment'),
  value: z.string().trim().min(1),
})

export const menuClustererGroupMixSchema = z.object({
  priceLevels: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  storytellingStrongCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
  puzzleCount: z.number().int().nonnegative(),
})

export const menuClustererGroupItemSchema = z.object({
  name: z.string().trim().min(1),
  role: menuTaggerItemRoleSchema,
  category: z.string().trim().min(1),
  position: z.number().int().min(1).max(12),
  popularity: z.number().min(0).max(1).optional(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  storytellingFit: z.enum(['strong', 'weak']).optional(),
  reelMoment: z.string().trim().min(1).optional(),
})

export type MenuClustererGroupItem = z.infer<typeof menuClustererGroupItemSchema>

export const menuClustererWeekdaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

export const menuClustererCategoryScopeSchema = z.enum(['categorical', 'creative'])

export const menuClustererGroupSchema = z
  .object({
    id: z.string().trim().min(1),
    leadName: z.string().trim().min(1),
    profileId: menuClustererProfileIdSchema,
    categoryScope: menuClustererCategoryScopeSchema.optional(),
    category: z.string().trim().min(1).optional(),
    anchor: menuClustererAnchorSchema,
    items: z.array(menuClustererGroupItemSchema).min(1).max(12),
    mix: menuClustererGroupMixSchema,
    clusterDescription: z.string().trim().min(40).optional(),
    strategyFocus: z.string().trim().min(1).optional(),
    coreMessage: z.string().trim().min(1).optional(),
    creativeRole: z.string().trim().min(1).optional(),
    assetHint: z.string().trim().min(1).optional(),
  })
  .superRefine((group, ctx) => {
    const maxItems =
      group.profileId === 'menu_highlight' ? 12 : group.profileId === 'top_five' ? 5 : 5
    if (group.items.length > maxItems) {
      ctx.addIssue({
        code: 'custom',
        message: `top_five and hook_reel groups allow up to 5 items; menu_highlight allows up to 12`,
        path: ['items'],
      })
    }
    if (group.profileId === 'top_five' && !group.category?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'category is required when profileId is top_five',
        path: ['category'],
      })
    }
  })

export type MenuClustererGroup = z.infer<typeof menuClustererGroupSchema>

export const menuClustererMilestoneDataSchema = z.object({
  foodLeads: z.array(menuTaggerItemSchema).default([]),
  groups: z.array(menuClustererGroupSchema),
  unassignedItemNames: z.array(z.string().trim().min(1)),
  topFoodLeadNames: z.array(z.string().trim().min(1)).max(12).default([]),
  targetGroupCount: menuClustererHookTargetGroupCountSchema.optional(),
  topFiveGroupCount: menuClustererTopFiveGroupCountSchema.optional(),
  sourceMenuTaggerTitle: z.string().optional(),
  sourceCampaignBriefTitle: z.string().optional(),
  notes: z.string().optional(),
})

export type MenuClustererMilestoneData = z.infer<typeof menuClustererMilestoneDataSchema>

export const schedulerSlotKindSchema = z.enum(['story', 'post', 'reel'])

function inferSchedulerSlotKindFromTitle(title: string): z.infer<typeof schedulerSlotKindSchema> {
  const trimmed = title.trimStart()
  if (trimmed.startsWith('Post:')) {
    return 'post'
  }
  if (trimmed.startsWith('Reel:')) {
    return 'reel'
  }
  return 'story'
}

export const schedulerSlotSchema = z
  .object({
    kind: schedulerSlotKindSchema.optional(),
    date: z.string(),
    time: z.string(),
    title: z.string(),
  })
  .transform((slot) => ({
    ...slot,
    kind: slot.kind ?? inferSchedulerSlotKindFromTitle(slot.title),
  }))

export type SchedulerSlot = z.infer<typeof schedulerSlotSchema>

export const schedulerMilestoneDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  publicHolidays: z.array(campaignWindowPublicHolidaySchema).default([]),
  scheduleExplanation: z.string().trim().min(1).optional(),
  sourceDatesTitle: z.string().optional(),
  sourceCampaignBriefTitle: z.string().optional(),
  slots: z.array(schedulerSlotSchema).default([]),
})

export type SchedulerMilestoneData = z.infer<typeof schedulerMilestoneDataSchema>

export {
  MENU_TAGGER_TAXONOMY_VERSION,
  computeMenuTaggerUsedTags,
  menuTaggerCourseSchema,
  menuTaggerIngredientSchema,
  menuTaggerKindSchema,
  menuTaggerTagsSchema,
  menuTaggerTasteSchema,
  menuTaggerUsedTagsSchema,
}
