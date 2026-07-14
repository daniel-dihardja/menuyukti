/**
 * Zod schemas for milestone preset payloads.
 */

import { z } from 'zod'

import { countCampaignWeeks, parseIsoDateOnly } from '@/lib/milestones/dates-window'
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
  'post_lineup',
  'reel_lineup',
  'story_lineup',
  'culture_hooks',
  'ig_profile',
  'ig_plan',
  'ig_menu_picker',
  'ig_format',
  'scheduler',
])

export type MilestonePresetId = z.infer<typeof milestonePresetIdSchema>

/** Ordered preset ids — single source for UI lists and guards. */
export const MILESTONE_PRESET_IDS = milestonePresetIdSchema.options

/**
 * Optional owner notes on the milestone Input tab (`value.notes`).
 * Campaign dates live on the separate `dates` milestone, not here.
 */
export const campaignBriefReflectionInputSchema = z.object({
  enabled: z.boolean(),
  maxRevisions: z.number().int().min(0).max(3),
})

export type CampaignBriefReflectionInput = z.infer<typeof campaignBriefReflectionInputSchema>

export const campaignBriefMilestoneInputValueSchema = z.object({
  notes: z.string(),
  reflection: campaignBriefReflectionInputSchema.optional(),
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

export const igPlanMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type IgPlanMilestoneInputValue = z.infer<typeof igPlanMilestoneInputValueSchema>

export const menuTaggerMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

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

export const menuClustererMilestoneInputValueSchema = z.object({
  notes: z.string(),
  targetGroupCount: menuClustererHookTargetGroupCountSchema.optional(),
})

export type MenuClustererMilestoneInputValue = z.infer<
  typeof menuClustererMilestoneInputValueSchema
>

export const postLineupMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type PostLineupMilestoneInputValue = z.infer<typeof postLineupMilestoneInputValueSchema>

export const reelLineupMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type ReelLineupMilestoneInputValue = z.infer<typeof reelLineupMilestoneInputValueSchema>

export const storyLineupMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type StoryLineupMilestoneInputValue = z.infer<typeof storyLineupMilestoneInputValueSchema>

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

export const campaignBriefOverallStrategySchema = z.object({
  strategyFocus: z.string().trim().min(1),
  audiencePriority: z.array(z.string().trim().min(1)),
  coreMessage: z.string().trim().min(1),
  offerWindow: z.string().trim().min(1),
  cadenceGuidance: z.array(z.string().trim().min(1)),
})

export type CampaignBriefOverallStrategy = z.infer<typeof campaignBriefOverallStrategySchema>

export const campaignBriefSlotCellSchema = z.object({
  day: z.string(),
  mealPeriod: z.string(),
  mealPeriodLabel: z.string(),
  mealPeriodHoursLabel: z.string(),
  orderCount: z.number().int().nonnegative(),
  demandIndex: z.number(),
  relativeDemand: z.enum(['low', 'average', 'high']),
  posture: z.enum(['support', 'promote', 'maintain']),
})

export type CampaignBriefSlotCell = z.infer<typeof campaignBriefSlotCellSchema>

export const campaignBriefSlotPerformanceSchema = z.object({
  sourceAnalyticsRunId: z.string().nullable().optional(),
  slots: z.array(campaignBriefSlotCellSchema),
  strongSlots: z.array(z.string()),
  slotsNeedingPromotion: z.array(z.string()),
  summary: z.string(),
})

export type CampaignBriefSlotPerformance = z.infer<typeof campaignBriefSlotPerformanceSchema>

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
  slotPerformance: campaignBriefSlotPerformanceSchema.optional(),
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

export const igMenuPickerMilestoneInputValueSchema = z.object({
  notes: z.string(),
  selectedSlotKeys: z.array(z.string().trim().min(1)).default([]),
})

export type IgMenuPickerMilestoneInputValue = z.infer<typeof igMenuPickerMilestoneInputValueSchema>

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

export const igFormatMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type IgFormatMilestoneInputValue = z.infer<typeof igFormatMilestoneInputValueSchema>

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

export const postLineupPostFormatSchema = z.literal('carousel')

export const postLineupPostIntentSchema = z.enum(['top_five_category', 'weekday_lunch_post'])

export const postLineupScheduleHintsSchema = z.object({
  preferredWeekdays: z.array(menuClustererWeekdaySchema).min(1),
  preferredTime: z.string().trim().min(1),
})

export type PostLineupScheduleHints = z.infer<typeof postLineupScheduleHintsSchema>

export const postLineupSlideSchema = z.object({
  dishName: z.string().trim().min(1),
  role: menuTaggerItemRoleSchema.optional(),
  category: z.string().trim().min(1).optional(),
  imageBrief: z.string().trim().min(1),
  caption: z.string().trim().min(1).optional(),
  storytellingFit: z.enum(['strong', 'weak']).optional(),
  popularity: z.number().min(0).max(1).optional(),
})

export type PostLineupSlide = z.infer<typeof postLineupSlideSchema>

export const postLineupPostSchema = z
  .object({
    id: z.string().trim().min(1),
    format: postLineupPostFormatSchema,
    intent: postLineupPostIntentSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    captionGuidance: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    intervalWeeks: z.number().int().positive().optional(),
    slides: z.array(postLineupSlideSchema).min(1).max(12),
    groupIds: z.array(z.string().trim().min(1)).optional(),
    date: z.string().optional(),
    fixdate: z.boolean().optional(),
    scheduleHints: postLineupScheduleHintsSchema.optional(),
  })
  .superRefine((post, ctx) => {
    const maxSlides = post.intent === 'top_five_category' ? 5 : 5
    if (post.slides.length > maxSlides) {
      ctx.addIssue({
        code: 'custom',
        message: `post with intent ${post.intent} must contain at most ${maxSlides} slides`,
        path: ['slides'],
      })
    }
    if (post.intent === 'top_five_category') {
      if (!post.category?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'category is required when intent is top_five_category',
          path: ['category'],
        })
      }
      post.slides.forEach((slide, slideIndex) => {
        if (!slide.caption?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: 'caption is required on every slide for top_five_category',
            path: ['slides', slideIndex, 'caption'],
          })
        }
      })
    }
    if (post.intent === 'weekday_lunch_post') {
      if (!post.description?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'description is required when intent is weekday_lunch_post',
          path: ['description'],
        })
      }
      if (!post.captionGuidance?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'captionGuidance is required when intent is weekday_lunch_post',
          path: ['captionGuidance'],
        })
      }
      if (!post.groupIds?.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'groupIds must contain at least one id for weekday_lunch_post',
          path: ['groupIds'],
        })
      }
    }
  })

export type PostLineupPost = z.infer<typeof postLineupPostSchema>

export const postLineupMilestoneDataSchema = z
  .object({
    posts: z.array(postLineupPostSchema),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sourceMenuClustererTitle: z.string().optional(),
    sourceCampaignBriefTitle: z.string().optional(),
    sourceMenuTaggerTitle: z.string().optional(),
    sourceDatesTitle: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const { posts, startDate, endDate } = data
    if (posts.length === 0) {
      return
    }

    if (!startDate?.trim() || !endDate?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'startDate and endDate are required when posts are present',
        path: ['startDate'],
      })
      return
    }

    const topFivePosts = posts.filter((post) => post.intent === 'top_five_category')

    if (posts.length > 0 && topFivePosts.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'post_lineup posts must use top_five_category intent',
        path: ['posts'],
      })
    }

    const seenCategories = new Set<string>()
    topFivePosts.forEach((post, index) => {
      const category = post.category?.trim().toLowerCase()
      if (!category) {
        ctx.addIssue({
          code: 'custom',
          message: 'category is required when intent is top_five_category',
          path: ['posts', index, 'category'],
        })
        return
      }
      if (seenCategories.has(category)) {
        ctx.addIssue({
          code: 'custom',
          message: 'top_five_category posts must not duplicate categories',
          path: ['posts', index, 'category'],
        })
      }
      seenCategories.add(category)
    })
  })

export type PostLineupMilestoneData = z.infer<typeof postLineupMilestoneDataSchema>

export const reelLineupReelIntentSchema = z.enum(['weekday_reel', 'weekend_reel'])

export const reelLineupHeroDishSchema = z.object({
  name: z.string().trim().min(1),
  reelMoment: z.string().optional(),
  role: menuTaggerItemRoleSchema.optional(),
  category: z.string().trim().min(1).optional(),
  storytellingFit: z.enum(['strong', 'weak']).optional(),
  popularity: z.number().min(0).max(1).optional(),
})

export type ReelLineupHeroDish = z.infer<typeof reelLineupHeroDishSchema>

export const reelLineupReelSchema = z.object({
  id: z.string().trim().min(1),
  format: z.literal('reel'),
  intent: reelLineupReelIntentSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  groupIds: z.array(z.string().trim().min(1)).min(1),
  weekIndex: z.number().int().positive().optional(),
  date: z.string().optional(),
  scheduleHints: postLineupScheduleHintsSchema.optional(),
  heroDishes: z.array(reelLineupHeroDishSchema).optional(),
})

export type ReelLineupReel = z.infer<typeof reelLineupReelSchema>

const REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX = 'weekday-reel-week-'
const REEL_LINEUP_WEEKEND_REEL_ID_PREFIX = 'weekend-reel-week-'

export const reelLineupMilestoneDataSchema = z
  .object({
    reels: z.array(reelLineupReelSchema),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sourceMenuClustererTitle: z.string().optional(),
    sourceCampaignBriefTitle: z.string().optional(),
    sourceDatesTitle: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const { reels, startDate, endDate } = data
    if (reels.length === 0) {
      return
    }

    if (!startDate?.trim() || !endDate?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'startDate and endDate are required when reels are present',
        path: ['startDate'],
      })
      return
    }

    const weekdayReels = reels.filter((reel) => reel.intent === 'weekday_reel')
    const weekendReels = reels.filter((reel) => reel.intent === 'weekend_reel')
    const expectedWeeks = countCampaignWeeks(startDate, endDate)
    const expectedReelCount = expectedWeeks * 2

    if (reels.length !== expectedReelCount) {
      ctx.addIssue({
        code: 'custom',
        message: 'must contain two reels (weekday + weekend) per campaign week in the dates window',
        path: ['reels'],
      })
    }

    if (weekdayReels.length !== expectedWeeks || weekendReels.length !== expectedWeeks) {
      ctx.addIssue({
        code: 'custom',
        message: 'must contain one weekday_reel and one weekend_reel per campaign week',
        path: ['reels'],
      })
    }

    const seenWeekdayStarts = new Set<string>()
    const seenWeekendStarts = new Set<string>()
    weekdayReels.forEach((reel, index) => {
      if (!reel.id.startsWith(REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekday_reel id must encode campaign week start',
          path: ['reels', index, 'id'],
        })
        return
      }
      const weekStart = reel.id.slice(REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX.length)
      if (!parseIsoDateOnly(weekStart)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekday_reel id week start must be a valid ISO date',
          path: ['reels', index, 'id'],
        })
        return
      }
      if (seenWeekdayStarts.has(weekStart)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekday_reel entries must map to distinct calendar weeks',
          path: ['reels', index, 'id'],
        })
      }
      seenWeekdayStarts.add(weekStart)
    })
    weekendReels.forEach((reel) => {
      const reelIndex = reels.indexOf(reel)
      if (!reel.id.startsWith(REEL_LINEUP_WEEKEND_REEL_ID_PREFIX)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekend_reel id must encode campaign week start',
          path: ['reels', reelIndex, 'id'],
        })
        return
      }
      const weekStart = reel.id.slice(REEL_LINEUP_WEEKEND_REEL_ID_PREFIX.length)
      if (!parseIsoDateOnly(weekStart)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekend_reel id week start must be a valid ISO date',
          path: ['reels', reelIndex, 'id'],
        })
        return
      }
      if (seenWeekendStarts.has(weekStart)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekend_reel entries must map to distinct calendar weeks',
          path: ['reels', reelIndex, 'id'],
        })
      }
      seenWeekendStarts.add(weekStart)
    })
  })

export type ReelLineupMilestoneData = z.infer<typeof reelLineupMilestoneDataSchema>

export const storyLineupStoryReasonSchema = z.enum(['public_holiday', 'user_review'])

export const storyLineupStorySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  date: z.string().optional(),
  fixdate: z.boolean().optional(),
  reason: storyLineupStoryReasonSchema.optional(),
  holidayName: z.string().optional(),
  time: z.string().optional(),
  intervalWeeks: z.number().int().positive().optional(),
})

export type StoryLineupStory = z.infer<typeof storyLineupStorySchema>

export const storyLineupMilestoneDataSchema = z
  .object({
    stories: z.array(storyLineupStorySchema),
    sourceDatesTitle: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    for (const [index, story] of data.stories.entries()) {
      if (story.fixdate && !story.date?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'date is required when fixdate is true',
          path: ['stories', index, 'date'],
        })
      }
    }
  })

export type StoryLineupMilestoneData = z.infer<typeof storyLineupMilestoneDataSchema>

export const schedulerSlotKindSchema = z.enum(['story', 'post', 'reel'])

/** Embedded post on a scheduler slot; infer category from slides when legacy rows omit it. */
export const schedulerEmbeddedPostSchema = z.preprocess((value) => {
  if (value == null || typeof value !== 'object') {
    return value
  }
  const post = value as {
    intent?: string
    category?: string
    slides?: Array<{ category?: string }>
  }
  if (post.intent !== 'top_five_category' || post.category?.trim()) {
    return value
  }
  const slideCategory = post.slides?.find((slide) => slide.category?.trim())?.category?.trim()
  if (!slideCategory) {
    return value
  }
  return { ...post, category: slideCategory }
}, postLineupPostSchema)

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
    post: schedulerEmbeddedPostSchema.optional(),
    reel: reelLineupReelSchema.optional(),
  })
  .transform((slot) => ({
    ...slot,
    kind: slot.kind ?? inferSchedulerSlotKindFromTitle(slot.title),
  }))

export const schedulerMilestoneDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  publicHolidays: z.array(campaignWindowPublicHolidaySchema).default([]),
  scheduleExplanation: z.string().trim().min(1).optional(),
  sourceDatesTitle: z.string().optional(),
  sourceCampaignBriefTitle: z.string().optional(),
  sourceMenuClustererTitle: z.string().optional(),
  sourcePostLineupTitle: z.string().optional(),
  sourceStoryLineupTitle: z.string().optional(),
  sourceReelLineupTitle: z.string().optional(),
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
