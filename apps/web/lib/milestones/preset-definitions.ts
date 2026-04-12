import type {
  MilestoneDataTask,
  PassCriteriaRow,
} from '@/app/(protected)/workflows/_components/timeline/types'

export const MILESTONE_PRESET_IDS = ['dates', 'restaurant_brand_brief', 'candidates'] as const

export type MilestonePresetId = (typeof MILESTONE_PRESET_IDS)[number]

export function isMilestonePresetId(value: string): value is MilestonePresetId {
  return (MILESTONE_PRESET_IDS as readonly string[]).includes(value)
}

/** New pass criteria rows (no `id` until persisted). */
export type MilestonePresetPassCriterionDraft = Pick<PassCriteriaRow, 'requirement' | 'status'>

export type MilestonePresetCreateFields = {
  name: string
  dataTask: MilestoneDataTask
  milestoneData: string
  goal?: string
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
        name: t('milestonePreset.dates.title'),
        dataTask: 'manual',
        milestoneData: t('milestonePreset.dates.dataMarkdown'),
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
    case 'restaurant_brand_brief':
      return {
        name: t('milestonePreset.restaurant_brand_brief.title'),
        dataTask: 'restaurant_brand_brief',
        milestoneData: t('milestonePreset.restaurant_brand_brief.dataMarkdown'),
        goal: t('milestonePreset.restaurant_brand_brief.goal'),
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
    case 'candidates':
      return {
        name: t('milestonePreset.candidates.title'),
        dataTask: 'promotion_candidates',
        milestoneData: t('milestonePreset.candidates.dataMarkdown'),
        goal: t('milestonePreset.candidates.goal'),
        passCriteria: [
          {
            requirement: t('milestonePreset.candidates.criterionVariationA'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.candidates.criterionVariationB'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.candidates.criterionCampaignWindow'),
            status: 'open',
          },
          {
            requirement: t('milestonePreset.candidates.criterionBrandBrief'),
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
