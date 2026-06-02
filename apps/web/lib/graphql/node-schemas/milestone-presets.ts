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

export const menuTaggerMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type MenuTaggerMilestoneInputValue = z.infer<typeof menuTaggerMilestoneInputValueSchema>

export const MENU_CLUSTERER_MIN_GROUP_COUNT = 4
export const MENU_CLUSTERER_DEFAULT_GROUP_COUNT = 4
export const MENU_CLUSTERER_MAX_GROUP_COUNT = 8

export const menuClustererTargetGroupCountSchema = z.union([
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
])

export type MenuClustererTargetGroupCount = z.infer<typeof menuClustererTargetGroupCountSchema>

export const menuClustererMilestoneInputValueSchema = z.object({
  notes: z.string(),
  targetGroupCount: menuClustererTargetGroupCountSchema.default(MENU_CLUSTERER_DEFAULT_GROUP_COUNT),
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

export const menuClustererProfileIdSchema = z.literal('hook_reel')

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
  position: z.number().int().min(1).max(5),
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

export const menuClustererGroupSchema = z.object({
  id: z.string().trim().min(1),
  leadName: z.string().trim().min(1),
  profileId: menuClustererProfileIdSchema,
  anchor: menuClustererAnchorSchema,
  items: z.array(menuClustererGroupItemSchema).min(1).max(5),
  mix: menuClustererGroupMixSchema,
  clusterDescription: z.string().trim().min(40).optional(),
  strategyFocus: z.string().trim().min(1).optional(),
  coreMessage: z.string().trim().min(1).optional(),
  creativeRole: z.string().trim().min(1).optional(),
  assetHint: z.string().trim().min(1).optional(),
})

export type MenuClustererGroup = z.infer<typeof menuClustererGroupSchema>

export const menuClustererMilestoneDataSchema = z.object({
  foodLeads: z.array(menuTaggerItemSchema).default([]),
  groups: z.array(menuClustererGroupSchema),
  unassignedItemNames: z.array(z.string().trim().min(1)),
  topFoodLeadNames: z.array(z.string().trim().min(1)).max(5).default([]),
  targetGroupCount: menuClustererTargetGroupCountSchema.optional(),
  sourceMenuTaggerTitle: z.string().optional(),
  sourceCampaignBriefTitle: z.string().optional(),
  notes: z.string().optional(),
})

export type MenuClustererMilestoneData = z.infer<typeof menuClustererMilestoneDataSchema>

export const postLineupPostFormatSchema = z.literal('carousel')

export const postLineupPostIntentSchema = z.enum(['pinned_monthly_menu', 'weekday_lunch_post'])

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
})

export type PostLineupSlide = z.infer<typeof postLineupSlideSchema>

export const postLineupPostSchema = z.object({
  id: z.string().trim().min(1),
  format: postLineupPostFormatSchema,
  intent: postLineupPostIntentSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  captionGuidance: z.string().trim().min(1).optional(),
  slides: z.array(postLineupSlideSchema).min(1).max(5),
  groupIds: z.array(z.string().trim().min(1)).min(1),
  date: z.string().optional(),
  fixdate: z.boolean().optional(),
  scheduleHints: postLineupScheduleHintsSchema.optional(),
})

export type PostLineupPost = z.infer<typeof postLineupPostSchema>

const POST_LINEUP_WEEKLY_POST_ID_PREFIX = 'weekday-lunch-post-week'

export const postLineupMilestoneDataSchema = z
  .object({
    posts: z.array(postLineupPostSchema),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sourceMenuClustererTitle: z.string().optional(),
    sourceCampaignBriefTitle: z.string().optional(),
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

    const monthlyPosts = posts.filter((post) => post.intent === 'pinned_monthly_menu')
    const weeklyPosts = posts.filter((post) => post.intent === 'weekday_lunch_post')

    if (monthlyPosts.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'must contain exactly one pinned_monthly_menu post',
        path: ['posts'],
      })
    }

    if (weeklyPosts.length < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'must contain at least one weekday_lunch_post for the campaign window',
        path: ['posts'],
      })
    }

    const expectedWeeks = countCampaignWeeks(startDate, endDate)
    if (weeklyPosts.length !== expectedWeeks) {
      ctx.addIssue({
        code: 'custom',
        message: 'must contain one weekday_lunch_post per campaign week in the dates window',
        path: ['posts'],
      })
    }

    const seenWeekStarts = new Set<string>()
    const idPrefix = `${POST_LINEUP_WEEKLY_POST_ID_PREFIX}-`
    weeklyPosts.forEach((post, index) => {
      if (!post.id.startsWith(idPrefix)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekday_lunch_post id must encode campaign week start',
          path: ['posts', index, 'id'],
        })
        return
      }
      const weekStart = post.id.slice(idPrefix.length)
      if (!parseIsoDateOnly(weekStart)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekday_lunch_post id week start must be a valid ISO date',
          path: ['posts', index, 'id'],
        })
        return
      }
      if (seenWeekStarts.has(weekStart)) {
        ctx.addIssue({
          code: 'custom',
          message: 'weekday_lunch_post entries must map to distinct calendar weeks',
          path: ['posts', index, 'id'],
        })
      }
      seenWeekStarts.add(weekStart)
    })
  })

export type PostLineupMilestoneData = z.infer<typeof postLineupMilestoneDataSchema>

export const reelLineupReelIntentSchema = z.enum(['weekday_reel', 'weekend_reel'])

export const reelLineupHeroDishSchema = z.object({
  name: z.string().trim().min(1),
  reelMoment: z.string().optional(),
  role: z.enum(['star', 'puzzle']).optional(),
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
    post: postLineupPostSchema.optional(),
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
