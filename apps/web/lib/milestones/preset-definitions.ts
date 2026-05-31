import {
  CalendarDays,
  CalendarRange,
  Clapperboard,
  ClipboardList,
  GalleryVerticalEnd,
  Images,
  Instagram,
  Lightbulb,
  ListChecks,
  Milestone,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import type { z } from 'zod'

import type { PassCriteriaRow } from '@/app/(protected)/workflow/_components/timeline/types'
import { DEFAULT_CAMPAIGN_BRIEF_REFLECTION } from '@/lib/milestones/campaign-brief-input'
import { buildCampaignBriefPassCriteriaSeed } from '@/lib/milestones/campaign-brief-pass-criteria'
import {
  MENU_TAGGER_TAXONOMY_VERSION,
  emptyMenuTaggerUsedTags,
} from '@/lib/milestones/menu-tagger-taxonomy'
import { EMPTY_POST_LINEUP_DATA } from '@/lib/milestones/post-lineup'
import { EMPTY_MENU_CLUSTERER_DATA } from '@/lib/milestones/menu-clusterer'
import { EMPTY_STORY_LINEUP_DATA } from '@/lib/milestones/story-lineup'
import {
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  datesMilestoneDataSchema,
  igProfileMilestoneDataSchema,
  menuTaggerMilestoneDataSchema,
  postLineupMilestoneDataSchema,
  menuClustererMilestoneDataSchema,
  storyLineupMilestoneDataSchema,
  schedulerMilestoneDataSchema,
  type MilestoneInput,
  type MilestonePresetId,
  MILESTONE_PRESET_IDS,
  type MilestonedataValue,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

export type { MilestonePresetId }
export { MILESTONE_PRESET_IDS }

export type MilestonePresetInputType =
  | 'dates'
  | 'promotion_candidates'
  | 'campaign_brief'
  | 'menu_clusterer'
  | 'optional_notes'
  | 'none'

export function isMilestonePresetId(value: string): value is MilestonePresetId {
  return (MILESTONE_PRESET_IDS as readonly string[]).includes(value)
}

/** New pass criteria rows; `id` is generated client-side before save. */
export type MilestonePresetPassCriterionDraft = Pick<PassCriteriaRow, 'requirement' | 'status'>

export type MilestonePresetCreateFields = {
  name: string
  presetId: MilestonePresetId
  milestoneData: MilestonedataValue
  milestoneInput?: MilestoneInput
  goal?: string
  /** Stored on milestone data as `passCriterias`. */
  passCriteria?: MilestonePresetPassCriterionDraft[]
}

type MilestonePresetCreateFieldsDraft = Omit<MilestonePresetCreateFields, 'presetId'>

export type MilestonePresetDefinition = {
  id: MilestonePresetId
  icon: LucideIcon
  inputType: MilestonePresetInputType
  dataSchema: z.ZodType<unknown>
  emptyData: MilestonedataValue
  getCreateFields: (t: (key: string) => string) => MilestonePresetCreateFieldsDraft
}

const EMPTY_DATES_DATA: MilestonedataValue = {
  startDate: '',
  endDate: '',
  publicHolidays: [],
}

const EMPTY_CAMPAIGN_BRIEF_DATA: MilestonedataValue = {
  venueSnapshot: {
    venueName: '',
    city: '',
    country: '',
    currency: '',
  },
  contentPillars: [],
  audienceHypotheses: [],
  proofOrientedAngles: [],
  toneGuardrails: [],
  campaignObjective: '',
  mainCategory: '(uncategorized)',
  targetSegments: [],
  messageHierarchy: [],
  offerAndCtaPlan: [],
  contentPillarPlan: [],
  measurementPlan: [],
  testingPlan: [],
  riskGuardrails: [],
}

const EMPTY_PROMOTION_CANDIDATES_DATA: MilestonedataValue = {
  mainCategory: '(uncategorized)',
  categories: [{ category: '(uncategorized)', starItems: [], puzzleItems: [] }],
  sourceAnalyticsRunId: null,
  notes: '',
}

const EMPTY_CULTURE_HOOKS_DATA: MilestonedataValue = {
  locationConcept: '',
  targetAudience: '',
  intersections: [],
  guardrailCheck: '',
}

const EMPTY_IG_PROFILE_DATA: MilestonedataValue = {
  usernames: [],
  bios: [],
}

const EMPTY_MENU_TAGGER_DATA: MilestonedataValue = {
  taxonomyVersion: MENU_TAGGER_TAXONOMY_VERSION,
  items: [],
  usedTags: emptyMenuTaggerUsedTags(),
}

const EMPTY_SCHEDULER_DATA: MilestonedataValue = {
  startDate: '',
  endDate: '',
  publicHolidays: [],
  slots: [],
}

export const MILESTONE_PRESET_REGISTRY: Record<MilestonePresetId, MilestonePresetDefinition> = {
  dates: {
    id: 'dates',
    icon: CalendarRange,
    inputType: 'dates',
    dataSchema: datesMilestoneDataSchema,
    emptyData: EMPTY_DATES_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.dates.title'),
      milestoneInput: {
        type: 'dates',
        value: { startDate: '', endDate: '' },
      },
      milestoneData: EMPTY_DATES_DATA,
      goal: t('milestonePreset.dates.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.dates.criterionStartDate'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.dates.criterionEndDate'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.dates.criterionPublicHolidays'),
          status: 'open',
        },
      ],
    }),
  },
  restaurant_campaign_brief: {
    id: 'restaurant_campaign_brief',
    icon: ClipboardList,
    inputType: 'campaign_brief',
    dataSchema: campaignBriefMilestoneDataSchema,
    emptyData: EMPTY_CAMPAIGN_BRIEF_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.restaurant_campaign_brief.title'),
      milestoneInput: {
        type: 'restaurant_campaign_brief',
        value: {
          notes: '',
          reflection: { ...DEFAULT_CAMPAIGN_BRIEF_REFLECTION },
        },
      },
      milestoneData: EMPTY_CAMPAIGN_BRIEF_DATA,
      goal: t('milestonePreset.restaurant_campaign_brief.goal'),
      passCriteria: buildCampaignBriefPassCriteriaSeed(t),
    }),
  },
  promotion_candidates: {
    id: 'promotion_candidates',
    icon: ListChecks,
    inputType: 'promotion_candidates',
    dataSchema: promotionCandidatesMilestoneDataSchema,
    emptyData: EMPTY_PROMOTION_CANDIDATES_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.promotion_candidates.title'),
      milestoneInput: {
        type: 'promotion_candidates',
        value: {
          notes: '',
          selectedMenuCategories: [],
          ignoredMenuItems: [],
          starItemLimit: 5,
          puzzleItemLimit: 10,
        },
      },
      milestoneData: EMPTY_PROMOTION_CANDIDATES_DATA,
      goal: t('milestonePreset.promotion_candidates.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.promotion_candidates.criterionCategoriesPresent'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.promotion_candidates.criterionItemsOnlyFromSignals'),
          status: 'open',
        },
      ],
    }),
  },
  menu_tagger: {
    id: 'menu_tagger',
    icon: Tags,
    inputType: 'optional_notes',
    dataSchema: menuTaggerMilestoneDataSchema,
    emptyData: EMPTY_MENU_TAGGER_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.menu_tagger.title'),
      milestoneInput: {
        type: 'menu_tagger',
        value: { notes: '' },
      },
      milestoneData: EMPTY_MENU_TAGGER_DATA,
      goal: t('milestonePreset.menu_tagger.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.menu_tagger.criterionPriorPromotionCandidates'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_tagger.criterionAllItemsTagged'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_tagger.criterionTaxonomyOnly'),
          status: 'open',
        },
      ],
    }),
  },
  menu_clusterer: {
    id: 'menu_clusterer',
    icon: Clapperboard,
    inputType: 'menu_clusterer',
    dataSchema: menuClustererMilestoneDataSchema,
    emptyData: EMPTY_MENU_CLUSTERER_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.menu_clusterer.title'),
      milestoneInput: {
        type: 'menu_clusterer',
        value: { notes: '', targetGroupCount: 4 },
      },
      milestoneData: EMPTY_MENU_CLUSTERER_DATA,
      goal: t('milestonePreset.menu_clusterer.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.menu_clusterer.criterionPriorCampaignBrief'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_clusterer.criterionPriorMenuTagger'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_clusterer.criterionHookGroupCount'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_clusterer.criterionTopFiveLead'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_clusterer.criterionClusterDescription'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.menu_clusterer.criterionSchedulingHints'),
          status: 'open',
        },
      ],
    }),
  },
  post_lineup: {
    id: 'post_lineup',
    icon: Images,
    inputType: 'optional_notes',
    dataSchema: postLineupMilestoneDataSchema,
    emptyData: EMPTY_POST_LINEUP_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.post_lineup.title'),
      milestoneInput: {
        type: 'post_lineup',
        value: { notes: '' },
      },
      milestoneData: EMPTY_POST_LINEUP_DATA,
      goal: t('milestonePreset.post_lineup.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.post_lineup.criterionPriorDates'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_lineup.criterionPriorCampaignBrief'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_lineup.criterionPriorMenuClusterer'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_lineup.criterionCarouselPost'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_lineup.criterionWeeklyFixdate'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_lineup.criterionSlideCount'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_lineup.criterionSlideFields'),
          status: 'open',
        },
      ],
    }),
  },
  story_lineup: {
    id: 'story_lineup',
    icon: GalleryVerticalEnd,
    inputType: 'optional_notes',
    dataSchema: storyLineupMilestoneDataSchema,
    emptyData: EMPTY_STORY_LINEUP_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.story_lineup.title'),
      milestoneInput: {
        type: 'story_lineup',
        value: { notes: '' },
      },
      milestoneData: EMPTY_STORY_LINEUP_DATA,
      goal: t('milestonePreset.story_lineup.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.story_lineup.criterionPriorDates'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.story_lineup.criterionStoriesPresent'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.story_lineup.criterionPublicHolidayFixdate'),
          status: 'open',
        },
      ],
    }),
  },
  culture_hooks: {
    id: 'culture_hooks',
    icon: Lightbulb,
    inputType: 'optional_notes',
    dataSchema: cultureHooksMilestoneDataSchema,
    emptyData: EMPTY_CULTURE_HOOKS_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.culture_hooks.title'),
      milestoneInput: {
        type: 'culture_hooks',
        value: { notes: '' },
      },
      milestoneData: EMPTY_CULTURE_HOOKS_DATA,
      goal: t('milestonePreset.culture_hooks.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.culture_hooks.criterionIntersectionsPresent'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.culture_hooks.criterionNonFood'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.culture_hooks.criterionAudienceConceptInferred'),
          status: 'open',
        },
      ],
    }),
  },
  ig_profile: {
    id: 'ig_profile',
    icon: Instagram,
    inputType: 'optional_notes',
    dataSchema: igProfileMilestoneDataSchema,
    emptyData: EMPTY_IG_PROFILE_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.ig_profile.title'),
      milestoneInput: {
        type: 'ig_profile',
        value: { notes: '' },
      },
      milestoneData: EMPTY_IG_PROFILE_DATA,
      goal: t('milestonePreset.ig_profile.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.ig_profile.criterionUsernames'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.ig_profile.criterionBioLength'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.ig_profile.criterionBioBreakdown'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.ig_profile.criterionBioVariations'),
          status: 'open',
        },
      ],
    }),
  },
  scheduler: {
    id: 'scheduler',
    icon: CalendarDays,
    inputType: 'optional_notes',
    dataSchema: schedulerMilestoneDataSchema,
    emptyData: EMPTY_SCHEDULER_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.scheduler.title'),
      milestoneData: EMPTY_SCHEDULER_DATA,
      milestoneInput: {
        type: 'scheduler',
        value: { notes: '' },
      },
      goal: t('milestonePreset.scheduler.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.scheduler.criterionPriorDates'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.scheduler.criterionPriorCampaignBrief'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.scheduler.criterionWindowPresent'),
          status: 'open',
        },
      ],
    }),
  },
}

export function getMilestonePresetDefinition(
  presetId: MilestonePresetId | undefined,
): MilestonePresetDefinition | undefined {
  if (!presetId) {
    return undefined
  }
  return MILESTONE_PRESET_REGISTRY[presetId]
}

export function milestonePresetIconFor(presetId?: MilestonePresetId): LucideIcon {
  if (!presetId) {
    return Milestone
  }
  return MILESTONE_PRESET_REGISTRY[presetId].icon
}

export function milestonePresetInputType(
  presetId: MilestonePresetId | undefined,
): MilestonePresetInputType {
  if (!presetId) {
    return 'none'
  }
  return MILESTONE_PRESET_REGISTRY[presetId].inputType
}

export function normalizeMilestonePresetData(
  presetId: MilestonePresetId | undefined,
  data: unknown,
): MilestonedataValue | undefined {
  if (!presetId || data == null) {
    return undefined
  }
  const def = MILESTONE_PRESET_REGISTRY[presetId]
  const parsed = def.dataSchema.safeParse(data)
  return parsed.success ? (parsed.data as MilestonedataValue) : undefined
}

/**
 * Resolved copy and markdown for POST+PATCH after create. `t` must be
 * `useTranslations('analytics.workflows.chat')`.
 */
export function getMilestonePresetCreateFields(
  presetId: MilestonePresetId,
  t: (key: string) => string,
): MilestonePresetCreateFields {
  const def = MILESTONE_PRESET_REGISTRY[presetId]
  return {
    presetId,
    ...def.getCreateFields(t),
  }
}
