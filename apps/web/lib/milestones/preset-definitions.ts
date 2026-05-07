import type { PassCriteriaRow } from '@/app/(protected)/campaigns/_components/timeline/types'
import { buildCampaignBriefPassCriteriaSeed } from '@/lib/milestones/campaign-brief-pass-criteria'
import { type MilestoneInput, type MilestonedataValue } from '@/lib/graphql/node-schemas'

export const MILESTONE_PRESET_IDS = ['restaurant_campaign_brief', 'post_scheduler'] as const

export type MilestonePresetId = (typeof MILESTONE_PRESET_IDS)[number]

export function isMilestonePresetId(value: string): value is MilestonePresetId {
  return (MILESTONE_PRESET_IDS as readonly string[]).includes(value)
}

/** New pass criteria rows (no `id` until persisted). */
export type MilestonePresetPassCriterionDraft = Pick<PassCriteriaRow, 'requirement' | 'status'>

export type MilestonePresetCreateFields = {
  name: string
  presetId: MilestonePresetId
  milestoneData: MilestonedataValue
  milestoneInput?: MilestoneInput
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
    case 'restaurant_campaign_brief':
      return {
        presetId: 'restaurant_campaign_brief',
        name: t('milestonePreset.restaurant_campaign_brief.title'),
        milestoneInput: {
          type: 'restaurant_campaign_brief',
          value: { notes: '', startDate: '', endDate: '' },
        },
        milestoneData: {
          startDate: '',
          endDate: '',
          publicHolidays: [],
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
          posts: [],
          daySummary: { weekdayCount: 0, weekendCount: 0 },
          promotionCandidates: {
            grouping: 'by_menu_category',
            categories: {},
          },
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
    default: {
      const _exhaustive: never = presetId
      throw new Error(`Unknown milestone preset: ${_exhaustive}`)
    }
  }
}
