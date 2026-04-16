import type {
  MilestoneDataTask,
  MilestoneRunSkillMode,
  PassCriteriaRow,
} from '@/app/(protected)/workflows/_components/timeline/types'
import type { MilestoneInput, MilestonedataValue } from '@/lib/graphql/node-schemas'

export const MILESTONE_PRESET_IDS = [
  'dates',
  'restaurant_brand_brief',
  'promotion_candidates',
] as const

export type MilestonePresetId = (typeof MILESTONE_PRESET_IDS)[number]

export function isMilestonePresetId(value: string): value is MilestonePresetId {
  return (MILESTONE_PRESET_IDS as readonly string[]).includes(value)
}

/** New pass criteria rows (no `id` until persisted). */
export type MilestonePresetPassCriterionDraft = Pick<PassCriteriaRow, 'requirement' | 'status'>

export type MilestonePresetCreateFields = {
  name: string
  dataTask: MilestoneDataTask
  presetId: MilestonePresetId
  milestoneData: MilestonedataValue
  milestoneInput?: MilestoneInput
  goal?: string
  milestoneRunSkillMode?: MilestoneRunSkillMode
  milestoneRunSkillIds?: string[]
  /** Applied in a follow-up PATCH (API handles `passCriteria` separately from goal/Data). */
  passCriteria?: MilestonePresetPassCriterionDraft[]
}

/**
 * Resolved copy and markdown for POST+PATCH after create. `t` must be
 * `useTranslations('analytics.campaigns.chat')`.
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
        dataTask: 'manual',
        milestoneInput: {
          type: 'dates',
          value: {
            startDate: '',
            endDate: '',
          },
        },
        milestoneData: {
          startDate: '',
          endDate: '',
          publicHolidays: [],
        },
        goal: t('milestonePreset.dates.goal'),
        milestoneRunSkillMode: 'fixed',
        milestoneRunSkillIds: ['public_holidays'],
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
    case 'restaurant_brand_brief':
      return {
        presetId: 'restaurant_brand_brief',
        name: t('milestonePreset.restaurant_brand_brief.title'),
        dataTask: 'manual',
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
        },
        goal: t('milestonePreset.restaurant_brand_brief.goal'),
        milestoneRunSkillMode: 'fixed',
        milestoneRunSkillIds: ['brand_brief'],
        passCriteria: [
          {
            requirement: t('milestonePreset.restaurant_brand_brief.criterionVenueSnapshot'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.restaurant_brand_brief.criterionContentPillars'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.restaurant_brand_brief.criterionAudienceHypotheses'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.restaurant_brand_brief.criterionProofAngles'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.restaurant_brand_brief.criterionToneGuardrails'),
            status: 'open',
          },
        ],
      }
    case 'promotion_candidates':
      return {
        presetId: 'promotion_candidates',
        name: t('milestonePreset.promotion_candidates.title'),
        dataTask: 'manual',
        milestoneData: t('milestonePreset.promotion_candidates.dataMarkdown'),
        goal: t('milestonePreset.promotion_candidates.goal'),
        milestoneRunSkillMode: 'fixed',
        milestoneRunSkillIds: ['promotion_candidates'],
        passCriteria: [
          {
            requirement: t('milestonePreset.promotion_candidates.criterionPromotionCandidates'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.promotion_candidates.criterionEvidenceGrounding'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.promotion_candidates.criterionCampaignWindow'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.promotion_candidates.criterionBrandBrief'),
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
