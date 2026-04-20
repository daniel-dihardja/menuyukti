'use client'

import { useTranslations } from 'next-intl'

import {
  brandBriefMilestoneDataSchema,
  datesMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
  schedulerMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

import type { TimelineMilestone } from '../timeline/types'

import { MilestoneBrandBriefDataPreview } from './milestone-brand-brief-data-preview'
import { MilestoneDatesDataPreview } from './milestone-dates-data-preview'
import { MilestonePromotionDataPreview } from './milestone-promotion-data-preview'
import { MilestoneSchedulerDataPreview } from './milestone-scheduler-data-preview'

export type MilestoneDataPreviewProps = {
  milestone: TimelineMilestone
}

export function MilestoneDataPreview({ milestone }: MilestoneDataPreviewProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const data = milestone.data

  if (data == null) {
    return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataEmpty')}</p>
  }

  if (typeof data === 'object') {
    if (milestone.presetId === 'dates') {
      const parsedDates = datesMilestoneDataSchema.safeParse(data)
      if (!parsedDates.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <div className="min-h-0 overflow-auto rounded-md border p-4">
          <MilestoneDatesDataPreview
            data={parsedDates.data}
            labels={{
              startDate: t('milestoneDatesPreviewStartDate'),
              endDate: t('milestoneDatesPreviewEndDate'),
              publicHolidays: t('milestoneDatesPreviewPublicHolidays'),
              noHolidays: t('milestoneDatesPreviewNoHolidays'),
              emptyValue: t('milestoneDatesPreviewValueEmpty'),
            }}
          />
        </div>
      )
    }

    if (milestone.presetId === 'restaurant_brand_brief') {
      const parsedBrandBrief = brandBriefMilestoneDataSchema.safeParse(data)
      if (!parsedBrandBrief.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <div className="min-h-0 overflow-auto rounded-md border p-4">
          <MilestoneBrandBriefDataPreview
            data={parsedBrandBrief.data}
            labels={{
              venueSnapshot: t('milestoneBrandBriefPreviewVenueSnapshot'),
              venueName: t('milestoneBrandBriefPreviewVenueName'),
              city: t('milestoneBrandBriefPreviewCity'),
              country: t('milestoneBrandBriefPreviewCountry'),
              currency: t('milestoneBrandBriefPreviewCurrency'),
              contentPillars: t('milestoneBrandBriefPreviewContentPillars'),
              audienceHypotheses: t('milestoneBrandBriefPreviewAudienceHypotheses'),
              proofOrientedAngles: t('milestoneBrandBriefPreviewProofOrientedAngles'),
              toneGuardrails: t('milestoneBrandBriefPreviewToneGuardrails'),
              emptyList: t('milestoneBrandBriefPreviewEmptyList'),
              emptyValue: t('milestoneBrandBriefPreviewEmptyValue'),
            }}
          />
        </div>
      )
    }

    if (milestone.presetId === 'promotion_candidates') {
      const parsedPromotion = promotionCandidatesMilestoneDataSchema.safeParse(data)
      if (!parsedPromotion.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <div className="min-h-0 overflow-auto rounded-md border p-4">
          <MilestonePromotionDataPreview
            data={parsedPromotion.data}
            labels={{
              placement: t('milestonePromotionPreviewPlacement'),
              puzzlePool: t('milestonePromotionPreviewPuzzlePool'),
              puzzleItemsFound: t('milestonePromotionPreviewPuzzleItemsFound'),
              threshold: t('milestonePromotionPreviewThreshold'),
              selectedCount: t('milestonePromotionPreviewSelectedCount'),
              promotionCandidates: t('milestonePromotionPreviewPromotionCandidates'),
              rankedCandidates: t('milestonePromotionPreviewRankedCandidates'),
              rankedCandidatesCount: t('milestonePromotionPreviewRankedCandidatesCount', {
                count: parsedPromotion.data.rankedCandidates.length,
              }),
              context: t('milestonePromotionPreviewContext'),
              campaignWindow: t('milestonePromotionPreviewCampaignWindow'),
              brandBrief: t('milestonePromotionPreviewBrandBrief'),
              menu: t('milestonePromotionPreviewMenu'),
              rationale: t('milestonePromotionPreviewRationale'),
              instagram: t('milestonePromotionPreviewInstagram'),
              emptyList: t('milestoneBrandBriefPreviewEmptyList'),
              emptyValue: t('milestoneBrandBriefPreviewEmptyValue'),
            }}
          />
        </div>
      )
    }

    if (milestone.presetId === 'scheduler') {
      const parsedScheduler = schedulerMilestoneDataSchema.safeParse(data)
      if (!parsedScheduler.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <div className="min-h-0 overflow-auto rounded-md border p-4">
          <MilestoneSchedulerDataPreview
            data={parsedScheduler.data}
            labels={{
              schedules: t('milestoneSchedulerPreviewSchedules'),
              dateTime: t('milestoneSchedulerPreviewDateTime'),
              type: t('milestoneSchedulerPreviewType'),
              promotedMenuItems: t('milestoneSchedulerPreviewPromotedMenuItems'),
              visualIdea: t('milestoneSchedulerPreviewVisualIdea'),
              captionIdea: t('milestoneSchedulerPreviewCaptionIdea'),
              emptyList: t('milestoneBrandBriefPreviewEmptyList'),
              emptyValue: t('milestoneBrandBriefPreviewEmptyValue'),
            }}
          />
        </div>
      )
    }
  }

  return <p className="text-muted-foreground text-sm">{t('milestonePreviewUnsupported')}</p>
}
