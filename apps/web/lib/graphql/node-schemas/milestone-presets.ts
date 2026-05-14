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
  'reel_lineup',
  'culture_hooks',
  'ig_profile',
  'scheduler',
])

export type MilestonePresetId = z.infer<typeof milestonePresetIdSchema>

/** Ordered preset ids — single source for UI lists and guards. */
export const MILESTONE_PRESET_IDS = milestonePresetIdSchema.options

/**
 * Optional owner notes on the milestone Input tab (`value.notes`).
 * Used by the campaign_brief preset.
 */
export const campaignBriefMilestoneInputValueSchema = z.object({
  notes: z.string(),
  startDate: z.string(),
  endDate: z.string(),
})

export type CampaignBriefMilestoneInputValue = z.infer<
  typeof campaignBriefMilestoneInputValueSchema
>

export const cultureHooksMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type CultureHooksMilestoneInputValue = z.infer<typeof cultureHooksMilestoneInputValueSchema>

export const igProfileMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type IgProfileMilestoneInputValue = z.infer<typeof igProfileMilestoneInputValueSchema>

export const menuTaggerMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type MenuTaggerMilestoneInputValue = z.infer<typeof menuTaggerMilestoneInputValueSchema>

export const reelLineupMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type ReelLineupMilestoneInputValue = z.infer<typeof reelLineupMilestoneInputValueSchema>

export const schedulerMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type SchedulerMilestoneInputValue = z.infer<typeof schedulerMilestoneInputValueSchema>

export const promotionCandidatesItemLimitSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal('all'),
])

export type PromotionCandidatesItemLimit = z.infer<typeof promotionCandidatesItemLimitSchema>

/** Promotion candidates Input tab: optional notes plus POS menu category filter (empty = all). */
export const promotionCandidatesMilestoneInputValueSchema = z.object({
  notes: z.string(),
  selectedMenuCategories: z.array(z.string().trim().min(1)),
  ignoredMenuItems: z.array(z.string().trim().min(1)).default([]),
  starItemLimit: promotionCandidatesItemLimitSchema.default(5),
  puzzleItemLimit: promotionCandidatesItemLimitSchema.default(10),
})

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

export const campaignBriefMilestoneDataSchema = z.object({
  venueSnapshot: campaignBriefVenueSnapshotSchema,
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

export const reelLineupProfileIdSchema = z.literal('hook_reel')

export const reelLineupAnchorSchema = z.object({
  dimension: z.literal('reel_moment'),
  value: z.string().trim().min(1),
})

export const reelLineupGroupMixSchema = z.object({
  priceLevels: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  storytellingStrongCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
  puzzleCount: z.number().int().nonnegative(),
})

export const reelLineupGroupItemSchema = z.object({
  name: z.string().trim().min(1),
  role: menuTaggerItemRoleSchema,
  category: z.string().trim().min(1),
  position: z.number().int().min(1).max(5),
  popularity: z.number().min(0).max(1).optional(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  storytellingFit: z.enum(['strong', 'weak']).optional(),
  reelMoment: z.string().trim().min(1).optional(),
})

export type ReelLineupGroupItem = z.infer<typeof reelLineupGroupItemSchema>

export const reelLineupGroupSchema = z.object({
  id: z.string().trim().min(1),
  leadName: z.string().trim().min(1),
  profileId: reelLineupProfileIdSchema,
  anchor: reelLineupAnchorSchema,
  items: z.array(reelLineupGroupItemSchema).min(1).max(5),
  mix: reelLineupGroupMixSchema,
})

export type ReelLineupGroup = z.infer<typeof reelLineupGroupSchema>

export const reelLineupMilestoneDataSchema = z.object({
  groups: z.array(reelLineupGroupSchema),
  drinkGroups: z.array(reelLineupGroupSchema).default([]),
  unassignedItemNames: z.array(z.string().trim().min(1)),
  sourceMenuTaggerTitle: z.string().optional(),
  notes: z.string().optional(),
})

export type ReelLineupMilestoneData = z.infer<typeof reelLineupMilestoneDataSchema>

export const schedulerSlotSchema = z.object({
  date: z.string(),
  time: z.string(),
  title: z.string(),
})

export const schedulerMilestoneDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  publicHolidays: z.array(campaignWindowPublicHolidaySchema).default([]),
  sourceDatesTitle: z.string().optional(),
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
