'use client'

import { useLocale, useTranslations } from 'next-intl'

import {
  campaignBriefMilestoneDataSchema,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

import type { TimelineMilestone } from '../timeline/types'

import { MilestoneCampaignBriefDataPreview } from './milestone-campaign_brief-data-preview'
import { MilestonePostSchedulerDataPreview } from './milestone-post-scheduler-data-preview'
import { MilestonePromotionCandidatesDataPreview } from './milestone-promotion-candidates-data-preview'

export type MilestoneDataPreviewProps = {
  milestone: TimelineMilestone
}

export function MilestoneDataPreview({ milestone }: MilestoneDataPreviewProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const locale = useLocale()
  const data = milestone.data

  if (data == null) {
    return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataEmpty')}</p>
  }

  if (typeof data === 'object') {
    if (milestone.presetId === 'restaurant_campaign_brief') {
      const parsedCampaignBrief = campaignBriefMilestoneDataSchema.safeParse(data)
      if (!parsedCampaignBrief.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <MilestoneCampaignBriefDataPreview
          data={parsedCampaignBrief.data}
          labels={{
            startDate: t('milestoneCampaignBriefPreviewStartDate'),
            endDate: t('milestoneCampaignBriefPreviewEndDate'),
            publicHolidays: t('milestoneCampaignBriefPreviewPublicHolidays'),
            noHolidays: t('milestoneCampaignBriefPreviewNoHolidays'),
            venueName: t('milestoneCampaignBriefPreviewVenueName'),
            city: t('milestoneCampaignBriefPreviewCity'),
            country: t('milestoneCampaignBriefPreviewCountry'),
            currency: t('milestoneCampaignBriefPreviewCurrency'),
            contentPillars: t('milestoneCampaignBriefPreviewContentPillars'),
            audienceHypotheses: t('milestoneCampaignBriefPreviewAudienceHypotheses'),
            proofOrientedAngles: t('milestoneCampaignBriefPreviewProofOrientedAngles'),
            toneGuardrails: t('milestoneCampaignBriefPreviewToneGuardrails'),
            campaignObjective: t('milestoneCampaignBriefPreviewCampaignObjective'),
            targetSegments: t('milestoneCampaignBriefPreviewTargetSegments'),
            messageHierarchy: t('milestoneCampaignBriefPreviewMessageHierarchy'),
            offerAndCtaPlan: t('milestoneCampaignBriefPreviewOfferAndCtaPlan'),
            contentPillarPlan: t('milestoneCampaignBriefPreviewContentPillarPlan'),
            measurementPlan: t('milestoneCampaignBriefPreviewMeasurementPlan'),
            testingPlan: t('milestoneCampaignBriefPreviewTestingPlan'),
            riskGuardrails: t('milestoneCampaignBriefPreviewRiskGuardrails'),
            emptyList: t('milestoneCampaignBriefPreviewEmptyList'),
            emptyValue: t('milestoneCampaignBriefPreviewEmptyValue'),
          }}
        />
      )
    }

    if (milestone.presetId === 'promotion_candidates') {
      const parsedPc = promotionCandidatesMilestoneDataSchema.safeParse(data)
      if (!parsedPc.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <MilestonePromotionCandidatesDataPreview
          data={parsedPc.data}
          labels={{
            grouping: t('milestonePromotionCandidatesPreviewGrouping'),
            flatSummary: t('milestonePromotionCandidatesPreviewFlatSummary'),
            promotionIdeas: t('milestonePromotionCandidatesPreviewPromotionIdeas'),
            categoryMenu: t('milestonePromotionCandidatesPreviewCategoryMenu'),
            starHighlights: t('milestonePromotionCandidatesPreviewStarHighlights'),
            puzzleHighlights: t('milestonePromotionCandidatesPreviewPuzzleHighlights'),
            notes: t('milestonePromotionCandidatesPreviewNotes'),
            emptyList: t('milestoneCampaignBriefPreviewEmptyList'),
            emptyValue: t('milestoneCampaignBriefPreviewEmptyValue'),
          }}
        />
      )
    }

    if (milestone.presetId === 'post_scheduler') {
      const parsedPs = postSchedulerMilestoneDataSchema.safeParse(data)
      if (!parsedPs.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <MilestonePostSchedulerDataPreview
          data={parsedPs.data}
          labels={{
            postsHeading: t('milestonePostSchedulerPreviewPostsHeading'),
            emptyPosts: t('milestonePostSchedulerPreviewEmptyPosts'),
            dayDateTime: t('milestonePostSchedulerPreviewDayDateTime'),
            postType: t('milestonePostSchedulerPreviewPostType'),
            contentType: t('milestonePostSchedulerPreviewContentType'),
            promotedItems: t('milestonePostSchedulerPreviewPromotedItems'),
            captionIdea: t('milestonePostSchedulerPreviewCaptionIdea'),
          }}
        />
      )
    }
  }

  return <p className="text-muted-foreground text-sm">{t('milestonePreviewUnsupported')}</p>
}
