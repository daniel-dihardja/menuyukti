'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'

import type {
  PromotionCandidateMenuItem,
  PromotionCandidatesMilestoneData,
} from '@/lib/graphql/node-schemas'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestonePromotionCandidatesDataPreviewProps = {
  data: PromotionCandidatesMilestoneData
}

type PromotionCandidatesPreviewLabels = {
  heading: string
  mainCategoryLabel: string
  emptyCategory: string
  starItemsLabel: string
  puzzleItemsLabel: string
  notesLabel: string
  noNotes: string
  storytellingStrong: string
  storytellingWeak: string
  storytellingWhy: string
  storytellingFitSection: string
  summary: string
  helpHeading: string
  helpStarItems: string
  helpPuzzleItems: string
  helpStorytellingFit: string
  placeholderEmDash: string
  formatHelpAriaLabel: (sectionTitle: string) => string
}

function SectionHeader({
  title,
  helpText,
  formatHelpAriaLabel,
}: {
  title: string
  helpText: string
  formatHelpAriaLabel: (sectionTitle: string) => string
}) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <p className={`min-w-0 flex-1 ${mp.sectionTitle}`}>{title}</p>
      <MilestonePreviewHelpTrigger ariaLabel={formatHelpAriaLabel(title)} helpText={helpText} />
    </div>
  )
}

function renderMenuItems(
  items: PromotionCandidateMenuItem[],
  labels: PromotionCandidatesPreviewLabels,
) {
  if (items.length === 0) {
    return <p className={mp.body}>{labels.placeholderEmDash}</p>
  }

  return (
    <ul className="list-none space-y-3 pl-0">
      {items.map((item, index) => {
        const isStrong = item.storytellingFit === 'strong'
        const fitLabel = isStrong ? labels.storytellingStrong : labels.storytellingWeak
        const rationale = item.storytellingRationale?.trim()
        const storytellingBadgeClassName = isStrong
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100'
        return (
          <li key={`${item.name}-${index}`} className="border-l-2 border-muted pl-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={mp.bodyStrong}>{item.name}</span>
              <div className="flex items-center gap-0.5">
                <Badge variant="outline" className={storytellingBadgeClassName}>
                  {fitLabel}
                </Badge>
                <MilestonePreviewHelpTrigger
                  ariaLabel={labels.formatHelpAriaLabel(labels.storytellingFitSection)}
                  helpText={labels.helpStorytellingFit}
                />
              </div>
            </div>
            {rationale ? (
              <p className={`mt-2 ${mp.bodySmall} leading-relaxed`}>
                <span className={mp.rowKey}>{labels.storytellingWhy}:</span> {rationale}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function MilestonePromotionCandidatesDataPreview({
  data,
}: MilestonePromotionCandidatesDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const labels = useMemo<PromotionCandidatesPreviewLabels>(
    () => ({
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
      formatHelpAriaLabel: (sectionTitle: string) =>
        t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle }),
    }),
    [t],
  )
  const a = labels.formatHelpAriaLabel

  return (
    <div className={mp.root}>
      <div className="space-y-2">
        <SectionHeader
          title={labels.heading}
          helpText={labels.helpHeading}
          formatHelpAriaLabel={a}
        />
        <p className={`${mp.bodySmall} text-pretty`}>{labels.summary}</p>
        <p className={mp.body}>
          <span className={mp.rowKey}>{labels.mainCategoryLabel}:</span> {data.mainCategory}
        </p>
      </div>

      <div className="space-y-4">
        {data.categories.map((bucket) => {
          const hasItems = bucket.starItems.length > 0 || bucket.puzzleItems.length > 0
          return (
            <div key={bucket.category} className="space-y-3">
              <p className={mp.sectionTitle}>{bucket.category}</p>
              {!hasItems ? (
                <p className={mp.body}>{labels.emptyCategory}</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex min-w-0 items-center gap-0.5">
                      <p className={`min-w-0 flex-1 ${mp.rowKey}`}>{labels.starItemsLabel}</p>
                      <MilestonePreviewHelpTrigger
                        ariaLabel={a(labels.starItemsLabel)}
                        helpText={labels.helpStarItems}
                      />
                    </div>
                    {renderMenuItems(bucket.starItems, labels)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex min-w-0 items-center gap-0.5">
                      <p className={`min-w-0 flex-1 ${mp.rowKey}`}>{labels.puzzleItemsLabel}</p>
                      <MilestonePreviewHelpTrigger
                        ariaLabel={a(labels.puzzleItemsLabel)}
                        helpText={labels.helpPuzzleItems}
                      />
                    </div>
                    {renderMenuItems(bucket.puzzleItems, labels)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{labels.notesLabel}</p>
        <p className={mp.body}>{data.notes?.trim() ? data.notes : labels.noNotes}</p>
      </div>
    </div>
  )
}
