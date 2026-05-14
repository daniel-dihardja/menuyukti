import {
  CalendarRange,
  Clapperboard,
  ClipboardList,
  Instagram,
  Lightbulb,
  ListChecks,
  Milestone,
  PieChart,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import type { z } from 'zod'

import type { PassCriteriaRow } from '@/app/(protected)/workflow/_components/timeline/types'
import { buildCampaignBriefPassCriteriaSeed } from '@/lib/milestones/campaign-brief-pass-criteria'
import {
  MENU_TAGGER_TAXONOMY_VERSION,
  emptyMenuTaggerUsedTags,
} from '@/lib/milestones/menu-tagger-taxonomy'
import { EMPTY_REEL_LINEUP_DATA } from '@/lib/milestones/reel-lineup'
import {
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  datesMilestoneDataSchema,
  formatMixMilestoneDataSchema,
  igProfileMilestoneDataSchema,
  menuTaggerMilestoneDataSchema,
  reelLineupMilestoneDataSchema,
  type MilestoneInput,
  type MilestonePresetId,
  MILESTONE_PRESET_IDS,
  type MilestonedataValue,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

export type { MilestonePresetId }
export { MILESTONE_PRESET_IDS }

export type MilestonePresetInputType = 'dates' | 'promotion_candidates' | 'optional_notes' | 'none'

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

const EMPTY_POST_SCHEDULER_DATA: MilestonedataValue = {
  monthlyArc: {
    weeks: [
      { week: 1, objective: '', rationale: '' },
      { week: 2, objective: '', rationale: '' },
      { week: 3, objective: '', rationale: '' },
      { week: 4, objective: '', rationale: '' },
    ],
  },
  contentRatio: { pillars: [] },
  formatMix: { formats: [] },
  weeklySlotPlan: [],
  guardrailCheck: '',
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

const EMPTY_FORMAT_MIX_DATA: MilestonedataValue = {
  formats: [],
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
    inputType: 'optional_notes',
    dataSchema: campaignBriefMilestoneDataSchema,
    emptyData: EMPTY_CAMPAIGN_BRIEF_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.restaurant_campaign_brief.title'),
      milestoneInput: {
        type: 'restaurant_campaign_brief',
        value: { notes: '' },
      },
      milestoneData: EMPTY_CAMPAIGN_BRIEF_DATA,
      goal: t('milestonePreset.restaurant_campaign_brief.goal'),
      passCriteria: buildCampaignBriefPassCriteriaSeed(t),
    }),
  },
  post_scheduler: {
    id: 'post_scheduler',
    icon: Milestone,
    inputType: 'optional_notes',
    dataSchema: postSchedulerMilestoneDataSchema,
    emptyData: EMPTY_POST_SCHEDULER_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.post_scheduler.title'),
      milestoneInput: {
        type: 'post_scheduler',
        value: { notes: '' },
      },
      milestoneData: EMPTY_POST_SCHEDULER_DATA,
      goal: t('milestonePreset.post_scheduler.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.post_scheduler.criterionPostsGenerated'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_scheduler.criterionPostFields'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.post_scheduler.criterionMenuItems'),
          status: 'open',
        },
      ],
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
  reel_lineup: {
    id: 'reel_lineup',
    icon: Clapperboard,
    inputType: 'optional_notes',
    dataSchema: reelLineupMilestoneDataSchema,
    emptyData: EMPTY_REEL_LINEUP_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.reel_lineup.title'),
      milestoneInput: {
        type: 'reel_lineup',
        value: { notes: '' },
      },
      milestoneData: EMPTY_REEL_LINEUP_DATA,
      goal: t('milestonePreset.reel_lineup.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.reel_lineup.criterionPriorMenuTagger'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.reel_lineup.criterionGroupSize'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.reel_lineup.criterionStarLead'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.reel_lineup.criterionSharedReelMoment'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.reel_lineup.criterionDrinkEnd'),
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
  format_mix: {
    id: 'format_mix',
    icon: PieChart,
    inputType: 'optional_notes',
    dataSchema: formatMixMilestoneDataSchema,
    emptyData: EMPTY_FORMAT_MIX_DATA,
    getCreateFields: (t) => ({
      name: t('milestonePreset.format_mix.title'),
      milestoneInput: {
        type: 'format_mix',
        value: { notes: '' },
      },
      milestoneData: EMPTY_FORMAT_MIX_DATA,
      goal: t('milestonePreset.format_mix.goal'),
      passCriteria: [
        {
          requirement: t('milestonePreset.format_mix.criterionBriefGrounded'),
          status: 'open',
        },
        {
          requirement: t('milestonePreset.format_mix.criterionMixDefined'),
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
  return parsed.success ? (parsed.data as MilestonedataValue) : def.emptyData
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
