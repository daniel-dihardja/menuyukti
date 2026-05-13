'use client'

import { ListFilter, X } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Separator } from '@workspace/ui/components/separator'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import type { PromotionCandidatesPreviewFilters } from '@/lib/milestones/promotion-candidates-filters'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export const PRICE_LEVEL_BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5'] as const

export const PRICE_LEVEL_TONE: Record<
  1 | 2 | 3,
  { icon: string; bar: string; badge: string; toggleOn: string }
> = {
  1: {
    icon: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500 dark:bg-sky-400',
    badge:
      'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100',
    toggleOn:
      'data-[state=on]:border-sky-300 data-[state=on]:bg-sky-50 data-[state=on]:text-sky-900 dark:data-[state=on]:border-sky-700 dark:data-[state=on]:bg-sky-950/60 dark:data-[state=on]:text-sky-100',
  },
  2: {
    icon: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500 dark:bg-amber-400',
    badge:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
    toggleOn:
      'data-[state=on]:border-amber-300 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-900 dark:data-[state=on]:border-amber-700 dark:data-[state=on]:bg-amber-950/60 dark:data-[state=on]:text-amber-100',
  },
  3: {
    icon: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500 dark:bg-violet-400',
    badge:
      'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100',
    toggleOn:
      'data-[state=on]:border-violet-300 data-[state=on]:bg-violet-50 data-[state=on]:text-violet-900 dark:data-[state=on]:border-violet-700 dark:data-[state=on]:bg-violet-950/60 dark:data-[state=on]:text-violet-100',
  },
}

const STORYTELLING_TOGGLE_ON = {
  strong:
    'data-[state=on]:border-emerald-300 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-900 dark:data-[state=on]:border-emerald-700 dark:data-[state=on]:bg-emerald-950/60 dark:data-[state=on]:text-emerald-100',
  weak: 'data-[state=on]:border-amber-300 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-900 dark:data-[state=on]:border-amber-700 dark:data-[state=on]:bg-amber-950/60 dark:data-[state=on]:text-amber-100',
} as const

export type PromotionCandidatesPreviewFilterLabels = {
  filtersTitle: string
  filtersDescription: string
  filtersStorytellingLabel: string
  filtersStorytellingAria: string
  filtersPriceLevelLabel: string
  filtersPriceLevelAria: string
  filtersClear: string
  storytellingStrong: string
  storytellingWeak: string
  priceLevelLow: string
  priceLevelMid: string
  priceLevelHigh: string
  itemCount: (count: number) => string
  filteredShowing: (visible: number, total: number) => string
  emptyFiltered: string
  emptyFilteredAction: string
}

export function PriceLevelBars({ level, className }: { level: 1 | 2 | 3; className?: string }) {
  const tone = PRICE_LEVEL_TONE[level]

  return (
    <span className={cn('inline-flex items-end gap-0.5', className)} aria-hidden>
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
  )
}

function FilterCountBadge({
  visible,
  total,
  labels,
}: {
  visible: number
  total: number
  labels: Pick<PromotionCandidatesPreviewFilterLabels, 'itemCount' | 'filteredShowing'>
}) {
  if (total === 0) {
    return null
  }

  return (
    <Badge variant="secondary" className="tabular-nums">
      {visible !== total ? labels.filteredShowing(visible, total) : labels.itemCount(total)}
    </Badge>
  )
}

function ActiveFilterChips({
  filters,
  labels,
}: {
  filters: PromotionCandidatesPreviewFilters
  labels: Pick<
    PromotionCandidatesPreviewFilterLabels,
    'storytellingStrong' | 'storytellingWeak' | 'priceLevelLow' | 'priceLevelMid' | 'priceLevelHigh'
  >
}) {
  const chips: { key: string; label: string; className?: string }[] = []

  if (filters.storytellingFit.length > 0 && filters.storytellingFit.length < 2) {
    for (const fit of filters.storytellingFit) {
      chips.push({
        key: `story-${fit}`,
        label: fit === 'strong' ? labels.storytellingStrong : labels.storytellingWeak,
        className:
          fit === 'strong'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
            : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
      })
    }
  }

  const priceLabels: Record<1 | 2 | 3, string> = {
    1: labels.priceLevelLow,
    2: labels.priceLevelMid,
    3: labels.priceLevelHigh,
  }

  if (filters.priceLevel.length > 0 && filters.priceLevel.length < 3) {
    for (const level of filters.priceLevel) {
      chips.push({
        key: `price-${level}`,
        label: priceLabels[level],
        className: PRICE_LEVEL_TONE[level].badge,
      })
    }
  }

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="list">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="outline" className={cn('font-normal', chip.className)}>
          {chip.label}
        </Badge>
      ))}
    </div>
  )
}

export function FilteredEmptyState({
  message,
  actionLabel,
  onClearFilters,
}: {
  message: string
  actionLabel: string
  onClearFilters: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2.5">
      <p className={mp.bodySmall}>{message}</p>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto self-start px-0"
        onClick={onClearFilters}
      >
        {actionLabel}
      </Button>
    </div>
  )
}

type PromotionCandidatesPreviewFiltersPanelProps = {
  filters: PromotionCandidatesPreviewFilters
  onFiltersChange: (filters: PromotionCandidatesPreviewFilters) => void
  onClearFilters: () => void
  visibleCount: number
  totalCount: number
  filtersActive: boolean
  labels: PromotionCandidatesPreviewFilterLabels
}

export function PromotionCandidatesPreviewFiltersPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  visibleCount,
  totalCount,
  filtersActive,
  labels,
}: PromotionCandidatesPreviewFiltersPanelProps) {
  return (
    <div className={cn(mp.insetCard, 'flex flex-col gap-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ListFilter className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className={mp.sectionTitle}>{labels.filtersTitle}</p>
          <FilterCountBadge visible={visibleCount} total={totalCount} labels={labels} />
        </div>
        {filtersActive ? (
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
            <X data-icon="inline-start" />
            {labels.filtersClear}
          </Button>
        ) : null}
      </div>

      <FieldDescription>{labels.filtersDescription}</FieldDescription>

      <Separator />

      <FieldGroup className="gap-4 @md/field-group:grid @md/field-group:grid-cols-2">
        <Field className="gap-2">
          <FieldLabel>{labels.filtersStorytellingLabel}</FieldLabel>
          <ToggleGroup
            type="multiple"
            className="w-full"
            value={filters.storytellingFit}
            onValueChange={(value) => {
              onFiltersChange({
                ...filters,
                storytellingFit: value.filter(
                  (entry): entry is 'strong' | 'weak' => entry === 'strong' || entry === 'weak',
                ),
              })
            }}
            aria-label={labels.filtersStorytellingAria}
          >
            <ToggleGroupItem value="strong" className={cn('flex-1', STORYTELLING_TOGGLE_ON.strong)}>
              {labels.storytellingStrong}
            </ToggleGroupItem>
            <ToggleGroupItem value="weak" className={cn('flex-1', STORYTELLING_TOGGLE_ON.weak)}>
              {labels.storytellingWeak}
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field className="gap-2">
          <FieldLabel>{labels.filtersPriceLevelLabel}</FieldLabel>
          <ToggleGroup
            type="multiple"
            className="w-full"
            value={filters.priceLevel.map(String)}
            onValueChange={(value) => {
              onFiltersChange({
                ...filters,
                priceLevel: value
                  .map((entry) => Number(entry))
                  .filter((entry): entry is 1 | 2 | 3 => entry === 1 || entry === 2 || entry === 3),
              })
            }}
            aria-label={labels.filtersPriceLevelAria}
          >
            {([1, 2, 3] as const).map((level) => (
              <ToggleGroupItem
                key={level}
                value={String(level)}
                className={cn('flex-1 gap-1.5', PRICE_LEVEL_TONE[level].toggleOn)}
              >
                <PriceLevelBars level={level} />
                {level === 1
                  ? labels.priceLevelLow
                  : level === 2
                    ? labels.priceLevelMid
                    : labels.priceLevelHigh}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </FieldGroup>

      {filtersActive ? <ActiveFilterChips filters={filters} labels={labels} /> : null}
    </div>
  )
}
