'use client'

import { useMemo } from 'react'
import {
  type LucideIcon,
  Calendar,
  Camera,
  ChefHat,
  Clapperboard,
  CookingPot,
  Flame,
  Layers,
  Leaf,
  Thermometer,
  UtensilsCrossed,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'

import type { MenuTaggerItem, MenuTaggerMilestoneData } from '@/lib/graphql/node-schemas'
import {
  formatMenuTaggerTagLabel,
  groupMenuTaggerItemsByCategory,
} from '@/lib/milestones/menu-tagger-items'
import {
  MENU_TAGGER_DIMENSIONS,
  MENU_TAGGER_SINGLE_VALUE_DIMENSIONS,
  computeMenuTaggerUsedTags,
  type MenuTaggerDimension,
} from '@/lib/milestones/menu-tagger-taxonomy'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneMenuTaggerDataPreviewProps = {
  data: MenuTaggerMilestoneData
}

const DIMENSION_ICONS: Record<MenuTaggerDimension, LucideIcon> = {
  kind: UtensilsCrossed,
  ingredient: Leaf,
  taste: Flame,
  course: ChefHat,
  reel_moment: Clapperboard,
  texture: Layers,
  prep_style: CookingPot,
  occasion: Calendar,
  serve_temp: Thermometer,
  content_angle: Camera,
}

const DIMENSIONS_WITH_HELP: readonly MenuTaggerDimension[] = [
  'reel_moment',
  'content_angle',
  'texture',
  'prep_style',
]

const ROLE_BADGE_CLASS = {
  star: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  puzzle:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
} as const

function dimensionLabelKey(dimension: MenuTaggerDimension): string {
  return `milestoneMenuTaggerPreviewDimension_${dimension}`
}

function dimensionHelpKey(dimension: MenuTaggerDimension): string {
  return `milestoneMenuTaggerPreviewHelp_${dimension}`
}

function isSingleValueDimension(dimension: MenuTaggerDimension): boolean {
  return (MENU_TAGGER_SINGLE_VALUE_DIMENSIONS as readonly string[]).includes(dimension)
}

function dimensionValues(item: MenuTaggerItem, dimension: MenuTaggerDimension): string[] {
  if (isSingleValueDimension(dimension)) {
    const value = item.tags[dimension as keyof typeof item.tags]
    return typeof value === 'string' && value.length > 0 ? [value] : []
  }
  return item.tags[dimension] as string[]
}

function countPopulatedDimensions(usedTags: MenuTaggerMilestoneData['usedTags']): number {
  return MENU_TAGGER_DIMENSIONS.filter((dimension) => usedTags[dimension].length > 0).length
}

type SectionHeaderProps = {
  title: string
  helpText?: string
  formatHelpAriaLabel: (sectionTitle: string) => string
}

function SectionHeader({ title, helpText, formatHelpAriaLabel }: SectionHeaderProps) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <p className={`min-w-0 flex-1 ${mp.sectionTitle}`}>{title}</p>
      {helpText ? (
        <MilestonePreviewHelpTrigger ariaLabel={formatHelpAriaLabel(title)} helpText={helpText} />
      ) : null}
    </div>
  )
}

function DimensionTagRow({
  dimension,
  formatHelpAriaLabel,
  label,
  helpText,
  values,
}: {
  dimension: MenuTaggerDimension
  formatHelpAriaLabel?: (sectionTitle: string) => string
  label: string
  helpText?: string
  values: string[]
}) {
  if (values.length === 0) {
    return null
  }

  const showHelp = helpText && formatHelpAriaLabel && DIMENSIONS_WITH_HELP.includes(dimension)

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`${mp.fieldLabel} shrink-0`}>{label}</span>
      {showHelp ? (
        <MilestonePreviewHelpTrigger ariaLabel={formatHelpAriaLabel(label)} helpText={helpText} />
      ) : null}
      <TagBadgeList values={values} dimension={dimension} />
    </div>
  )
}

const REEL_MOMENT_BADGE_CLASS =
  'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100'

function MenuTaggerTagBadge({
  value,
  dimension,
}: {
  value: string
  dimension?: MenuTaggerDimension
}) {
  const Icon = dimension ? DIMENSION_ICONS[dimension] : null
  const isReelMoment = dimension === 'reel_moment'

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 px-1.5 py-0.5 font-normal', isReelMoment && REEL_MOMENT_BADGE_CLASS)}
    >
      {Icon ? (
        <Icon
          className={cn(
            'size-3 shrink-0 opacity-70',
            isReelMoment && 'text-sky-700 dark:text-sky-300',
          )}
          aria-hidden
        />
      ) : null}
      {formatMenuTaggerTagLabel(value)}
    </Badge>
  )
}

function TagBadgeList({
  values,
  dimension,
}: {
  values: string[]
  dimension?: MenuTaggerDimension
}) {
  if (values.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <MenuTaggerTagBadge key={value} value={value} dimension={dimension} />
      ))}
    </div>
  )
}

function TaggedItemsEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

type ItemTagsRowProps = {
  item: MenuTaggerItem
  dimensionLabels: Record<MenuTaggerDimension, string>
  roleStarLabel: string
  rolePuzzleLabel: string
}

function ItemTagsRow({ item, dimensionLabels, roleStarLabel, rolePuzzleLabel }: ItemTagsRowProps) {
  const t = useTranslations('analytics.workflows.chat')
  const roleLabel = item.role === 'star' ? roleStarLabel : rolePuzzleLabel
  const isStrong = item.storytellingFit === 'strong'
  const fitLabel = isStrong
    ? t('milestonePromotionCandidatesPreviewStorytellingStrong')
    : t('milestonePromotionCandidatesPreviewStorytellingWeak')
  const storytellingBadgeClassName = isStrong
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100'

  return (
    <li className={mp.insetCard}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 ${mp.body} font-medium text-foreground`}>{item.name}</p>
        <Badge variant="outline" className={cn('shrink-0', ROLE_BADGE_CLASS[item.role])}>
          {roleLabel}
        </Badge>
      </div>
      <div className="mt-2">
        <Badge variant="outline" className={storytellingBadgeClassName}>
          {fitLabel}
        </Badge>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {MENU_TAGGER_DIMENSIONS.map((dimension) => (
          <DimensionTagRow
            key={dimension}
            dimension={dimension}
            label={dimensionLabels[dimension]}
            values={dimensionValues(item, dimension)}
          />
        ))}
      </div>
    </li>
  )
}

function SummaryStrip({
  summaryLabel,
  sourceTitle,
  sourceTitleLabel,
}: {
  summaryLabel: string
  sourceTitle?: string
  sourceTitleLabel: string
}) {
  return (
    <div className={`${mp.insetCard} flex flex-col gap-2`}>
      <p className={`${mp.bodySmall} text-pretty text-foreground`}>{summaryLabel}</p>
      {sourceTitle ? (
        <p className={mp.bodySmall}>
          <span className={mp.rowKey}>{sourceTitleLabel}:</span> {sourceTitle}
        </p>
      ) : null}
    </div>
  )
}

export function MilestoneMenuTaggerDataPreview({ data }: MilestoneMenuTaggerDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  const usedTags = useMemo(() => {
    if (data.usedTags && Object.keys(data.usedTags).length > 0) {
      return data.usedTags
    }
    return computeMenuTaggerUsedTags(data.items)
  }, [data.items, data.usedTags])

  const grouped = useMemo(
    () => groupMenuTaggerItemsByCategory(data.items, t('milestoneMenuTaggerPreviewUncategorized')),
    [data.items, t],
  )

  const starCount = useMemo(
    () => data.items.filter((item) => item.role === 'star').length,
    [data.items],
  )
  const puzzleCount = useMemo(
    () => data.items.filter((item) => item.role === 'puzzle').length,
    [data.items],
  )
  const dimensionCount = useMemo(() => countPopulatedDimensions(usedTags), [usedTags])

  const populatedDimensions = useMemo(
    () => MENU_TAGGER_DIMENSIONS.filter((dimension) => usedTags[dimension].length > 0),
    [usedTags],
  )

  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })

  const dimensionLabels = useMemo(
    () =>
      Object.fromEntries(
        MENU_TAGGER_DIMENSIONS.map((dimension) => [dimension, t(dimensionLabelKey(dimension))]),
      ) as Record<MenuTaggerDimension, string>,
    [t],
  )

  const dimensionHelp = useMemo(
    () =>
      Object.fromEntries(
        DIMENSIONS_WITH_HELP.map((dimension) => [dimension, t(dimensionHelpKey(dimension))]),
      ) as Partial<Record<MenuTaggerDimension, string>>,
    [t],
  )

  const sourceTitle = data.sourcePromotionCandidatesTitle?.trim() || undefined

  return (
    <div className="flex flex-col gap-5 text-base">
      <SummaryStrip
        sourceTitle={sourceTitle}
        sourceTitleLabel={t('milestoneMenuTaggerPreviewSourceTitle')}
        summaryLabel={t('milestoneMenuTaggerPreviewSummary', {
          itemCount: data.items.length,
          starCount,
          puzzleCount,
          dimensionCount,
        })}
      />

      <div className="flex flex-col gap-3">
        <SectionHeader
          title={t('milestoneMenuTaggerPreviewUsedTags')}
          helpText={t('milestoneMenuTaggerPreviewHelpUsedTags')}
          formatHelpAriaLabel={formatHelpAriaLabel}
        />
        {populatedDimensions.length === 0 ? (
          <p className={mp.body}>{t('milestoneMenuTaggerPreviewUsedTagsEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {populatedDimensions.map((dimension) => (
              <DimensionTagRow
                key={dimension}
                dimension={dimension}
                formatHelpAriaLabel={formatHelpAriaLabel}
                label={dimensionLabels[dimension]}
                helpText={dimensionHelp[dimension]}
                values={usedTags[dimension]}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <SectionHeader
          title={t('milestoneMenuTaggerPreviewTaggedItems')}
          helpText={t('milestoneMenuTaggerPreviewHelpTaggedItems')}
          formatHelpAriaLabel={formatHelpAriaLabel}
        />
        {grouped.length === 0 ? (
          <TaggedItemsEmptyState
            title={t('milestoneMenuTaggerPreviewEmptyTaggedTitle')}
            body={t('milestoneMenuTaggerPreviewEmptyTaggedBody')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([category, bucket]) => (
              <div key={category} className={`${mp.insetCard} flex flex-col gap-3`}>
                <p className={mp.sectionTitle}>{category}</p>
                {bucket.star.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className={mp.rowKey}>
                      {t('milestoneMenuTaggerPreviewStarItemsCount', { count: bucket.star.length })}
                    </p>
                    <ul className={`${mp.listDecimal} flex flex-col gap-2`}>
                      {bucket.star.map((item) => (
                        <ItemTagsRow
                          key={`star-${item.name}`}
                          item={item}
                          dimensionLabels={dimensionLabels}
                          roleStarLabel={t('milestoneMenuTaggerPreviewRoleStar')}
                          rolePuzzleLabel={t('milestoneMenuTaggerPreviewRolePuzzle')}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
                {bucket.star.length > 0 && bucket.puzzle.length > 0 ? <Separator /> : null}
                {bucket.puzzle.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className={mp.rowKey}>
                      {t('milestoneMenuTaggerPreviewPuzzleItemsCount', {
                        count: bucket.puzzle.length,
                      })}
                    </p>
                    <ul className={`${mp.listDecimal} flex flex-col gap-2`}>
                      {bucket.puzzle.map((item) => (
                        <ItemTagsRow
                          key={`puzzle-${item.name}`}
                          item={item}
                          dimensionLabels={dimensionLabels}
                          roleStarLabel={t('milestoneMenuTaggerPreviewRoleStar')}
                          rolePuzzleLabel={t('milestoneMenuTaggerPreviewRolePuzzle')}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className={mp.sectionTitle}>{t('milestoneMenuTaggerPreviewNotes')}</p>
        <p className={mp.body}>
          {data.notes?.trim() ? data.notes.trim() : t('milestoneMenuTaggerPreviewNoNotes')}
        </p>
      </div>
    </div>
  )
}
