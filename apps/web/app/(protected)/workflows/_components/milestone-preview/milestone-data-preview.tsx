'use client'

import { useLocale, useTranslations } from 'next-intl'

import {
  brandBriefMilestoneDataSchema,
  datesMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

import type { TimelineMilestone } from '../timeline/types'

import { MilestoneBrandBriefDataPreview } from './milestone-brand-brief-data-preview'
import { MilestoneDatesDataPreview } from './milestone-dates-data-preview'
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
    if (milestone.presetId === 'dates') {
      const parsedDates = datesMilestoneDataSchema.safeParse(data)
      if (!parsedDates.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <MilestoneDatesDataPreview
          data={parsedDates.data}
          locale={locale}
          labels={{
            startDate: t('milestoneDatesPreviewStartDate'),
            endDate: t('milestoneDatesPreviewEndDate'),
            publicHolidays: t('milestoneDatesPreviewPublicHolidays'),
            noHolidays: t('milestoneDatesPreviewNoHolidays'),
            emptyValue: t('milestoneDatesPreviewValueEmpty'),
          }}
        />
      )
    }

    if (milestone.presetId === 'restaurant_brand_brief') {
      const parsedBrandBrief = brandBriefMilestoneDataSchema.safeParse(data)
      if (!parsedBrandBrief.success) {
        return <p className="text-muted-foreground text-sm">{t('milestonePreviewDataInvalid')}</p>
      }

      return (
        <MilestoneBrandBriefDataPreview
          data={parsedBrandBrief.data}
          labels={{
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
            emptyList: t('milestoneBrandBriefPreviewEmptyList'),
            emptyValue: t('milestoneBrandBriefPreviewEmptyValue'),
          }}
        />
      )
    }
  }

  return <p className="text-muted-foreground text-sm">{t('milestonePreviewUnsupported')}</p>
}
