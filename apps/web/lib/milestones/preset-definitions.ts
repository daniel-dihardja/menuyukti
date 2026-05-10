import type { PassCriteriaRow } from '@/app/(protected)/workflow/_components/timeline/types'
import { buildCampaignBriefPassCriteriaSeed } from '@/lib/milestones/campaign-brief-pass-criteria'
import { type MilestoneInput, type MilestonedataValue } from '@/lib/graphql/node-schemas'

export const MILESTONE_PRESET_IDS = [
  'dates',
  'restaurant_campaign_brief',
  'post_scheduler',
  'promotion_candidates',
  'culture_hooks',
  'format_mix',
] as const

export type MilestonePresetId = (typeof MILESTONE_PRESET_IDS)[number]

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

/**
 * Resolved copy and markdown for POST+PATCH after create. `t` must be
 * `useTranslations('analytics.workflows.chat')`.
 */
export function getMilestonePresetCreateFields(
  presetId: MilestonePresetId,
  t: (key: string) => string,
): MilestonePresetCreateFields {
  switch (presetId) {
    case 'dates':
      return {
        presetId: 'dates',
        name: t('milestonePreset.dates.title'),
        milestoneInput: {
          type: 'dates',
          value: { startDate: '', endDate: '' },
        },
        milestoneData: {
          startDate: '',
          endDate: '',
          publicHolidays: [],
        },
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
      }
    case 'restaurant_campaign_brief':
      return {
        presetId: 'restaurant_campaign_brief',
        name: t('milestonePreset.restaurant_campaign_brief.title'),
        milestoneInput: {
          type: 'restaurant_campaign_brief',
          value: { notes: '' },
        },
        milestoneData: {
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
          mainCategory: 'FOOD',
          targetSegments: [],
          messageHierarchy: [],
          offerAndCtaPlan: [],
          contentPillarPlan: [],
          measurementPlan: [],
          testingPlan: [],
          riskGuardrails: [],
        },
        goal: t('milestonePreset.restaurant_campaign_brief.goal'),
        passCriteria: buildCampaignBriefPassCriteriaSeed(t),
      }
    case 'post_scheduler':
      return {
        presetId: 'post_scheduler',
        name: t('milestonePreset.post_scheduler.title'),
        milestoneInput: {
          type: 'post_scheduler',
          value: { notes: '' },
        },
        milestoneData: {
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
        },
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
      }
    case 'promotion_candidates':
      return {
        presetId: 'promotion_candidates',
        name: t('milestonePreset.promotion_candidates.title'),
        milestoneInput: {
          type: 'promotion_candidates',
          value: { notes: '' },
        },
        milestoneData: {
          mainCategory: 'FOOD',
          categories: [
            { category: 'FOOD', starItems: [], puzzleItems: [] },
            { category: 'DRINK', starItems: [], puzzleItems: [] },
          ],
          sourceAnalyticsRunId: null,
          notes: '',
        },
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
      }
    case 'culture_hooks':
      return {
        presetId: 'culture_hooks',
        name: t('milestonePreset.culture_hooks.title'),
        milestoneInput: {
          type: 'culture_hooks',
          value: { notes: '' },
        },
        milestoneData: {
          locationConcept: '',
          targetAudience: '',
          intersections: [],
          guardrailCheck: '',
        },
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
      }
    case 'format_mix':
      return {
        presetId: 'format_mix',
        name: t('milestonePreset.format_mix.title'),
        milestoneInput: {
          type: 'format_mix',
          value: { notes: '' },
        },
        milestoneData: {
          formats: [],
        },
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
      }
    default: {
      const _exhaustive: never = presetId
      throw new Error(`Unknown milestone preset: ${_exhaustive}`)
    }
  }
}
