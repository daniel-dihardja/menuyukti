'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { formatPreviewDateString } from '@/lib/format-preview-date'
import { milestonePresetIconFor } from '@/lib/milestones/milestone-icons'

import {
  datesMilestoneDataSchema,
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  formatMixMilestoneDataSchema,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

import type { MilestonePresetId, TimelineMilestone } from '../timeline/types'

import { MilestoneCampaignBriefDataPreview } from './milestone-campaign_brief-data-preview'
import { MilestoneCultureHooksDataPreview } from './milestone-culture-hooks-data-preview'
import { MilestoneDatesDataPreview } from './milestone-dates-data-preview'
import { MilestonePromotionCandidatesDataPreview } from './milestone-promotion-candidates-data-preview'
import { MilestonePostSchedulerDataPreview } from './milestone-post-scheduler-data-preview'

export type MilestoneDataPreviewProps = {
  milestone: TimelineMilestone
}

function MilestonePreviewPresetRow({ presetId }: { presetId: MilestonePresetId }) {
  const t = useTranslations('analytics.workflows.chat')
  const Icon = milestonePresetIconFor(presetId)
  const label =
    presetId === 'dates'
      ? t('milestonePreviewPresetBadge_dates')
      : presetId === 'restaurant_campaign_brief'
        ? t('milestonePreviewPresetBadge_restaurant_campaign_brief')
        : presetId === 'post_scheduler'
          ? t('milestonePreviewPresetBadge_post_scheduler')
          : presetId === 'promotion_candidates'
            ? t('milestonePreviewPresetBadge_promotion_candidates')
            : presetId === 'culture_hooks'
              ? t('milestonePreviewPresetBadge_culture_hooks')
              : t('milestonePreviewPresetBadge_format_mix')

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

function PreviewStateMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function withPresetRow(presetId: MilestonePresetId | undefined, inner: ReactNode) {
  return (
    <div className="space-y-4">
      {presetId ? <MilestonePreviewPresetRow presetId={presetId} /> : null}
      {inner}
    </div>
  )
}

export function MilestoneDataPreview({ milestone }: MilestoneDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const locale = useLocale()
  const formatPreviewDate = useMemo(
    () => (value: string) => formatPreviewDateString(value, locale),
    [locale],
  )
  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })

  const data = milestone.data
  const pid = milestone.presetId

  if (data == null) {
    return withPresetRow(
      pid,
      <PreviewStateMessage
        title={t('milestonePreviewDataEmptyTitle')}
        body={t('milestonePreviewDataEmptyBody')}
      />,
    )
  }

  if (typeof data === 'object') {
    if (milestone.presetId === 'dates') {
      const parsedDates = datesMilestoneDataSchema.safeParse(data)
      if (!parsedDates.success) {
        return withPresetRow(
          pid,
          <PreviewStateMessage
            title={t('milestonePreviewDataInvalidTitle')}
            body={t('milestonePreviewDataInvalidBody')}
          />,
        )
      }

      return withPresetRow(
        pid,
        <MilestoneDatesDataPreview
          data={parsedDates.data}
          formatDate={formatPreviewDate}
          labels={{
            startDate: t('milestoneDatesPreviewStartDate'),
            endDate: t('milestoneDatesPreviewEndDate'),
            publicHolidays: t('milestoneDatesPreviewPublicHolidays'),
            noHolidays: t('milestoneDatesPreviewNoHolidays'),
          }}
        />,
      )
    }

    if (milestone.presetId === 'restaurant_campaign_brief') {
      const parsedCampaignBrief = campaignBriefMilestoneDataSchema.safeParse(data)
      if (!parsedCampaignBrief.success) {
        return withPresetRow(
          pid,
          <PreviewStateMessage
            title={t('milestonePreviewDataInvalidTitle')}
            body={t('milestonePreviewDataInvalidBody')}
          />,
        )
      }

      return withPresetRow(
        pid,
        <MilestoneCampaignBriefDataPreview
          data={parsedCampaignBrief.data}
          formatHelpAriaLabel={formatHelpAriaLabel}
          labels={{
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
          }}
        />,
      )
    }

    if (milestone.presetId === 'post_scheduler') {
      const parsedPs = postSchedulerMilestoneDataSchema.safeParse(data)
      if (!parsedPs.success) {
        return withPresetRow(
          pid,
          <PreviewStateMessage
            title={t('milestonePreviewDataInvalidTitle')}
            body={t('milestonePreviewDataInvalidBody')}
          />,
        )
      }

      return withPresetRow(
        pid,
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
            rationaleLabel: t('milestonePostSchedulerPreviewRationaleLabel'),
            pillarLabel: t('milestonePostSchedulerPreviewPillarLabel'),
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
            placeholderDash: t('milestonePostSchedulerPreviewPlaceholderDash'),
            notesPlaceholder: t('milestonePostSchedulerPreviewNotesPlaceholder'),
            helpMonthlyArc: t('milestonePostSchedulerPreviewHelpMonthlyArc'),
            helpContentRatio: t('milestonePostSchedulerPreviewHelpContentRatio'),
            helpFormatMix: t('milestonePostSchedulerPreviewHelpFormatMix'),
            helpWeeklySlotPlan: t('milestonePostSchedulerPreviewHelpWeeklySlotPlan'),
            helpGuardrailCheck: t('milestonePostSchedulerPreviewHelpGuardrailCheck'),
            formatHelpAriaLabel,
          }}
        />,
      )
    }

    if (milestone.presetId === 'promotion_candidates') {
      const parsed = promotionCandidatesMilestoneDataSchema.safeParse(data)
      if (!parsed.success) {
        return withPresetRow(
          pid,
          <PreviewStateMessage
            title={t('milestonePreviewDataInvalidTitle')}
            body={t('milestonePreviewDataInvalidBody')}
          />,
        )
      }
      return withPresetRow(
        pid,
        <MilestonePromotionCandidatesDataPreview
          data={parsed.data}
          labels={{
            heading: t('milestonePromotionCandidatesPreviewHeading'),
            mainCategoryLabel: t('milestonePromotionCandidatesPreviewMainCategoryLabel'),
            emptyCategory: t('milestonePromotionCandidatesPreviewEmptyCategory'),
            starItemsLabel: t('milestonePromotionCandidatesPreviewStarItemsLabel'),
            puzzleItemsLabel: t('milestonePromotionCandidatesPreviewPuzzleItemsLabel'),
            notesLabel: t('milestonePromotionCandidatesPreviewNotesLabel'),
            noNotes: t('milestonePromotionCandidatesPreviewNoNotes'),
            storytellingStrong: t('milestonePromotionCandidatesPreviewStorytellingStrong'),
            storytellingWeak: t('milestonePromotionCandidatesPreviewStorytellingWeak'),
            storytellingWhy: t('milestonePromotionCandidatesPreviewStorytellingWhy'),
            storytellingFitSection: t('milestonePromotionCandidatesPreviewStorytellingFitSection'),
            summary: t('milestonePromotionCandidatesPreviewSummary'),
            helpHeading: t('milestonePromotionCandidatesPreviewHelpHeading'),
            helpStarItems: t('milestonePromotionCandidatesPreviewHelpStarItems'),
            helpPuzzleItems: t('milestonePromotionCandidatesPreviewHelpPuzzleItems'),
            helpStorytellingFit: t('milestonePromotionCandidatesPreviewHelpStorytellingFit'),
            placeholderEmDash: t('milestonePreviewPlaceholderEmDash'),
            formatHelpAriaLabel,
          }}
        />,
      )
    }

    if (milestone.presetId === 'culture_hooks') {
      const parsed = cultureHooksMilestoneDataSchema.safeParse(data)
      if (!parsed.success) {
        return withPresetRow(
          pid,
          <PreviewStateMessage
            title={t('milestonePreviewDataInvalidTitle')}
            body={t('milestonePreviewDataInvalidBody')}
          />,
        )
      }

      return withPresetRow(
        pid,
        <MilestoneCultureHooksDataPreview
          data={parsed.data}
          labels={{
            locationConcept: t('milestoneCultureHooksPreviewLocationConcept'),
            targetAudience: t('milestoneCultureHooksPreviewTargetAudience'),
            intersections: t('milestoneCultureHooksPreviewIntersections'),
            emptyIntersections: t('milestoneCultureHooksPreviewEmptyIntersections'),
            topic: t('milestoneCultureHooksPreviewTopic'),
            conceptLink: t('milestoneCultureHooksPreviewConceptLink'),
            audienceRelevance: t('milestoneCultureHooksPreviewAudienceRelevance'),
            contentExample: t('milestoneCultureHooksPreviewContentExample'),
            guardrailCheck: t('milestoneCultureHooksPreviewGuardrailCheck'),
            emptyValue: t('milestonePreviewEmptyValue'),
          }}
        />,
      )
    }

    if (milestone.presetId === 'format_mix') {
      const parsed = formatMixMilestoneDataSchema.safeParse(data)
      if (!parsed.success) {
        return withPresetRow(
          pid,
          <PreviewStateMessage
            title={t('milestonePreviewDataInvalidTitle')}
            body={t('milestonePreviewDataInvalidBody')}
          />,
        )
      }

      return withPresetRow(
        pid,
        <PreviewStateMessage
          title={t('milestoneFormatMixPreviewTitle')}
          body={t('milestoneFormatMixPreviewBody')}
        />,
      )
    }
  }

  return withPresetRow(
    pid,
    <PreviewStateMessage
      title={t('milestonePreviewUnsupportedTitle')}
      body={t('milestonePreviewUnsupportedBody')}
    />,
  )
}
