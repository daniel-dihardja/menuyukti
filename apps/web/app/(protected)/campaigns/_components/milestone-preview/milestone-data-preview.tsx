'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { formatPreviewDateString } from '@/lib/format-preview-date'

import {
  campaignBriefMilestoneDataSchema,
  postSchedulerMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

import type { TimelineMilestone } from '../timeline/types'

import { MilestoneCampaignBriefDataPreview } from './milestone-campaign_brief-data-preview'
import { MilestonePostSchedulerDataPreview } from './milestone-post-scheduler-data-preview'

export type MilestoneDataPreviewProps = {
  milestone: TimelineMilestone
}

export function MilestoneDataPreview({ milestone }: MilestoneDataPreviewProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const locale = useLocale()
  const formatPreviewDate = useMemo(
    () => (value: string) => formatPreviewDateString(value, locale),
    [locale],
  )
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
          formatDate={formatPreviewDate}
          formatHelpAriaLabel={(sectionTitle) =>
            t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })
          }
          labels={{
            startDate: t('milestoneCampaignBriefPreviewStartDate'),
            endDate: t('milestoneCampaignBriefPreviewEndDate'),
            publicHolidays: t('milestoneCampaignBriefPreviewPublicHolidays'),
            noHolidays: t('milestoneCampaignBriefPreviewNoHolidays'),
            venueSnapshot: t('milestoneCampaignBriefPreviewVenueSnapshot'),
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
            helpVenueSnapshot: t('milestoneCampaignBriefPreviewHelpVenueSnapshot'),
            helpContentPillars: t('milestoneCampaignBriefPreviewHelpContentPillars'),
            helpAudienceHypotheses: t('milestoneCampaignBriefPreviewHelpAudienceHypotheses'),
            helpProofOrientedAngles: t('milestoneCampaignBriefPreviewHelpProofOrientedAngles'),
            helpToneGuardrails: t('milestoneCampaignBriefPreviewHelpToneGuardrails'),
            helpCampaignObjective: t('milestoneCampaignBriefPreviewHelpCampaignObjective'),
            helpTargetSegments: t('milestoneCampaignBriefPreviewHelpTargetSegments'),
            helpMessageHierarchy: t('milestoneCampaignBriefPreviewHelpMessageHierarchy'),
            helpOfferAndCtaPlan: t('milestoneCampaignBriefPreviewHelpOfferAndCtaPlan'),
            helpContentPillarPlan: t('milestoneCampaignBriefPreviewHelpContentPillarPlan'),
            helpMeasurementPlan: t('milestoneCampaignBriefPreviewHelpMeasurementPlan'),
            helpTestingPlan: t('milestoneCampaignBriefPreviewHelpTestingPlan'),
            helpRiskGuardrails: t('milestoneCampaignBriefPreviewHelpRiskGuardrails'),
            helpStartDate: t('milestoneCampaignBriefPreviewHelpStartDate'),
            helpEndDate: t('milestoneCampaignBriefPreviewHelpEndDate'),
            helpPublicHolidays: t('milestoneCampaignBriefPreviewHelpPublicHolidays'),
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
            monthlyArcHeading: t('milestonePostSchedulerPreviewMonthlyArcHeading'),
            contentRatioHeading: t('milestonePostSchedulerPreviewContentRatioHeading'),
            formatMixHeading: t('milestonePostSchedulerPreviewFormatMixHeading'),
            weeklySlotPlanHeading: t('milestonePostSchedulerPreviewWeeklySlotPlanHeading'),
            emptyWeeklySlotPlan: t('milestonePostSchedulerPreviewEmptyWeeklySlotPlan'),
            guardrailCheckHeading: t('milestonePostSchedulerPreviewGuardrailCheckHeading'),
            weekLabel: t('milestonePostSchedulerPreviewWeekLabel'),
            objectiveLabel: t('milestonePostSchedulerPreviewObjectiveLabel'),
            rationaleLabel: t('milestonePostSchedulerPreviewRationaleLabel'),
            pillarLabel: t('milestonePostSchedulerPreviewPillarLabel'),
            percentLabel: t('milestonePostSchedulerPreviewPercentLabel'),
            reasonLabel: t('milestonePostSchedulerPreviewReasonLabel'),
            countLabel: t('milestonePostSchedulerPreviewCountLabel'),
            dayLabel: t('milestonePostSchedulerPreviewDayLabel'),
            formatLabel: t('milestonePostSchedulerPreviewFormatLabel'),
            hookLabel: t('milestonePostSchedulerPreviewHookLabel'),
            captionStructureLabel: t('milestonePostSchedulerPreviewCaptionStructureLabel'),
            ctaTypeLabel: t('milestonePostSchedulerPreviewCtaTypeLabel'),
            funnelStageLabel: t('milestonePostSchedulerPreviewFunnelStageLabel'),
            visualDirectionLabel: t('milestonePostSchedulerPreviewVisualDirectionLabel'),
            notesLabel: t('milestonePostSchedulerPreviewNotesLabel'),
          }}
        />
      )
    }
  }

  return <p className="text-muted-foreground text-sm">{t('milestonePreviewUnsupported')}</p>
}
