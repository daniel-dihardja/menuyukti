'use client'

import { useMemo } from 'react'
import { Banknote } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

import type {
  PromotionCandidateMenuItem,
  PromotionCandidatesMilestoneData,
} from '@/lib/graphql/node-schemas'
import {
  sortPromotionCandidateCategories,
  sortPromotionCandidateItemsByPopularity,
} from '@/lib/milestones/promotion-candidates-category-order'

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
  popularitySection: string
  metricsLine: (popularity: string, quantity: number) => string
  popularityOnlyLine: (popularity: string) => string
  quantityOnlyLine: (count: number) => string
  priceLevelSection: string
  priceLevelLow: string
  priceLevelMid: string
  priceLevelHigh: string
  summary: string
  helpHeading: string
  helpStarItems: string
  helpPuzzleItems: string
  helpStorytellingFit: string
  helpPopularity: string
  helpPriceLevel: string
  placeholderEmDash: string
  formatHelpAriaLabel: (sectionTitle: string) => string
}

const popularityPercentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 1,
})

function formatPopularityLabel(popularity: number): string {
  return popularityPercentFormatter.format(popularity)
}

function priceLevelLabel(
  level: 1 | 2 | 3,
  labels: Pick<
    PromotionCandidatesPreviewLabels,
    'priceLevelLow' | 'priceLevelMid' | 'priceLevelHigh'
  >,
): string {
  if (level === 1) {
    return labels.priceLevelLow
  }
  if (level === 3) {
    return labels.priceLevelHigh
  }
  return labels.priceLevelMid
}

const PRICE_LEVEL_BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5'] as const

const PRICE_LEVEL_TONE: Record<1 | 2 | 3, { icon: string; bar: string; badge: string }> = {
  1: {
    icon: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500 dark:bg-sky-400',
    badge:
      'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100',
  },
  2: {
    icon: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500 dark:bg-amber-400',
    badge:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
  },
  3: {
    icon: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500 dark:bg-violet-400',
    badge:
      'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100',
  },
}

function PriceLevelIndicator({
  level,
  label,
  sectionLabel,
}: {
  level: 1 | 2 | 3
  label: string
  sectionLabel: string
}) {
  const tone = PRICE_LEVEL_TONE[level]

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 px-1.5 py-0.5 font-normal', tone.badge)}
      aria-label={`${sectionLabel}: ${label}`}
      title={`${sectionLabel}: ${label}`}
    >
      <Banknote className={cn('size-3.5 shrink-0', tone.icon)} aria-hidden />
      <span className="inline-flex items-end gap-0.5" aria-hidden>
        {([1, 2, 3] as const).map((tier, index) => (
          <span
            key={tier}
            className={cn(
              'w-1 rounded-sm',
              PRICE_LEVEL_BAR_HEIGHTS[index],
              tier <= level ? tone.bar : 'bg-current/20',
            )}
          />
        ))}
      </span>
    </Badge>
  )
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

  const sortedItems = sortPromotionCandidateItemsByPopularity(items)

  return (
    <ul className="list-none space-y-3 pl-0">
      {sortedItems.map((item, index) => {
        const isStrong = item.storytellingFit === 'strong'
        const fitLabel = isStrong ? labels.storytellingStrong : labels.storytellingWeak
        const rationale = item.storytellingRationale?.trim()
        const storytellingBadgeClassName = isStrong
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100'
        const hasPopularity = 'popularity' in item && typeof item.popularity === 'number'
        const hasQuantity = 'quantity' in item && typeof item.quantity === 'number'
        const hasPriceLevel = 'priceLevel' in item && typeof item.priceLevel === 'number'
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
            {hasPopularity || hasQuantity ? (
              <p
                className={`mt-2 flex flex-wrap items-center gap-x-1 ${mp.bodySmall} text-muted-foreground`}
              >
                <span>
                  {hasPopularity && hasQuantity
                    ? labels.metricsLine(formatPopularityLabel(item.popularity!), item.quantity!)
                    : hasPopularity
                      ? labels.popularityOnlyLine(formatPopularityLabel(item.popularity!))
                      : labels.quantityOnlyLine(item.quantity!)}
                </span>
                {hasPopularity ? (
                  <MilestonePreviewHelpTrigger
                    ariaLabel={labels.formatHelpAriaLabel(labels.popularitySection)}
                    helpText={labels.helpPopularity}
                  />
                ) : null}
              </p>
            ) : null}
            {hasPriceLevel ? (
              <div
                className={`mt-1 flex flex-wrap items-center gap-x-1 ${mp.bodySmall} text-muted-foreground`}
              >
                <PriceLevelIndicator
                  level={item.priceLevel as 1 | 2 | 3}
                  label={priceLevelLabel(item.priceLevel as 1 | 2 | 3, labels)}
                  sectionLabel={labels.priceLevelSection}
                />
                <MilestonePreviewHelpTrigger
                  ariaLabel={labels.formatHelpAriaLabel(labels.priceLevelSection)}
                  helpText={labels.helpPriceLevel}
                />
              </div>
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
      popularitySection: t('milestonePromotionCandidatesPreviewPopularitySection'),
      metricsLine: (popularity: string, quantity: number) =>
        t('milestonePromotionCandidatesPreviewMetricsLine', {
          popularity,
          quantity: t('milestonePromotionCandidatesPreviewQuantityValue', { count: quantity }),
        }),
      popularityOnlyLine: (popularity: string) =>
        t('milestonePromotionCandidatesPreviewPopularityValue', { value: popularity }),
      quantityOnlyLine: (count: number) =>
        t('milestonePromotionCandidatesPreviewQuantityValue', { count }),
      priceLevelSection: t('milestonePromotionCandidatesPreviewPriceLevelSection'),
      priceLevelLow: t('milestonePromotionCandidatesPreviewPriceLevelLow'),
      priceLevelMid: t('milestonePromotionCandidatesPreviewPriceLevelMid'),
      priceLevelHigh: t('milestonePromotionCandidatesPreviewPriceLevelHigh'),
      summary: t('milestonePromotionCandidatesPreviewSummary'),
      helpHeading: t('milestonePromotionCandidatesPreviewHelpHeading'),
      helpStarItems: t('milestonePromotionCandidatesPreviewHelpStarItems'),
      helpPuzzleItems: t('milestonePromotionCandidatesPreviewHelpPuzzleItems'),
      helpStorytellingFit: t('milestonePromotionCandidatesPreviewHelpStorytellingFit'),
      helpPopularity: t('milestonePromotionCandidatesPreviewHelpPopularity'),
      helpPriceLevel: t('milestonePromotionCandidatesPreviewHelpPriceLevel'),
      placeholderEmDash: t('milestonePreviewPlaceholderEmDash'),
      formatHelpAriaLabel: (sectionTitle: string) =>
        t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle }),
    }),
    [t],
  )
  const a = labels.formatHelpAriaLabel
  const sortedCategories = useMemo(
    () => sortPromotionCandidateCategories(data.categories, data.mainCategory),
    [data.categories, data.mainCategory],
  )

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
        {sortedCategories.map((bucket) => {
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
