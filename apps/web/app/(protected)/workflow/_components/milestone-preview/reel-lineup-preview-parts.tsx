'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'

import type { ReelLineupHeroDish, ReelLineupReel } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

const ROLE_BADGE_CLASS = {
  star: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  puzzle:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
} as const

export function reelIntentBadgeLabel(
  intent: ReelLineupReel['intent'],
  t: ReturnType<typeof useTranslations>,
): string {
  if (intent === 'weekday_reel') {
    return t('milestoneReelLineupPreviewWeekdayBadge')
  }
  return t('milestoneReelLineupPreviewWeekendBadge')
}

export function ReelLineupReelBadges({ reel }: { reel: ReelLineupReel }) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{t('milestoneReelLineupPreviewReelBadge')}</Badge>
      <Badge variant="secondary">{reelIntentBadgeLabel(reel.intent, t)}</Badge>
    </div>
  )
}

const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

function weekdayLabel(
  day: (typeof WEEKDAY_KEYS)[number],
  labels: Record<(typeof WEEKDAY_KEYS)[number], string>,
): string {
  return labels[day]
}

export function ReelLineupReelScheduleHints({ reel }: { reel: ReelLineupReel }) {
  const t = useTranslations('analytics.workflows.chat')
  const hints = reel.scheduleHints
  if (!hints) {
    return null
  }

  const weekdayLabels = {
    monday: t('milestoneReelLineupPreviewWeekdayMonday'),
    tuesday: t('milestoneReelLineupPreviewWeekdayTuesday'),
    wednesday: t('milestoneReelLineupPreviewWeekdayWednesday'),
    thursday: t('milestoneReelLineupPreviewWeekdayThursday'),
    friday: t('milestoneReelLineupPreviewWeekdayFriday'),
    saturday: t('milestoneReelLineupPreviewWeekdaySaturday'),
    sunday: t('milestoneReelLineupPreviewWeekdaySunday'),
  }
  const preferredWeekdaysText = hints.preferredWeekdays
    .map((day) => weekdayLabel(day, weekdayLabels))
    .join(', ')

  return (
    <div className="flex flex-col gap-1">
      <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewScheduleHintsSectionTitle')}</p>
      <p className={mp.bodySmall}>
        <span className={mp.rowKey}>{t('milestoneReelLineupPreviewPreferredWeekdaysLabel')}:</span>{' '}
        {preferredWeekdaysText}
      </p>
      <p className={mp.bodySmall}>
        <span className={mp.rowKey}>{t('milestoneReelLineupPreviewPreferredTimeLabel')}:</span>{' '}
        {hints.preferredTime}
      </p>
    </div>
  )
}

export function ReelLineupReelCopy({ reel }: { reel: ReelLineupReel }) {
  const t = useTranslations('analytics.workflows.chat')
  const description = reel.description?.trim()
  const explanation = reel.explanation?.trim()
  const hasScheduleHints = Boolean(reel.scheduleHints)

  if (!description && !explanation && !hasScheduleHints) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <ReelLineupReelScheduleHints reel={reel} />
      {description ? (
        <div className="flex flex-col gap-1">
          <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewDescription')}</p>
          <p className={mp.body}>{description}</p>
        </div>
      ) : null}
      {explanation ? (
        <div className="flex flex-col gap-1">
          <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewExplanation')}</p>
          <p className={mp.body}>{explanation}</p>
        </div>
      ) : null}
    </div>
  )
}

export function ReelLineupHeroDishCard({
  dishNumber,
  dish,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  dishNumber: number
  dish: ReelLineupHeroDish
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')
  const reelMoment = dish.reelMoment?.trim()

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-foreground">
          {t('milestoneReelLineupPreviewHeroDishTitle', {
            number: dishNumber,
            dishName: dish.name,
          })}
        </p>
        {dish.role ? (
          <Badge variant="outline" className={ROLE_BADGE_CLASS[dish.role]}>
            {dish.role === 'star' ? roleStarLabel : rolePuzzleLabel}
          </Badge>
        ) : null}
      </div>
      {reelMoment ? (
        <div className="flex flex-col gap-1">
          <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewReelMoment')}</p>
          <p className={mp.body}>{reelMoment}</p>
        </div>
      ) : null}
    </div>
  )
}

export function ReelLineupHeroDishes({
  reel,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  reel: ReelLineupReel
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const heroDishes = reel.heroDishes ?? []
  if (heroDishes.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {heroDishes.map((dish, dishIndex) => (
        <ReelLineupHeroDishCard
          key={`${dish.name}-${dishIndex}`}
          dishNumber={dishIndex + 1}
          dish={dish}
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
      ))}
    </div>
  )
}

export function ReelLineupReelMeta({ reel }: { reel: ReelLineupReel }) {
  const t = useTranslations('analytics.workflows.chat')

  if (reel.groupIds.length === 0) {
    return null
  }

  return (
    <p className={mp.bodySmall}>
      <span className={mp.rowKey}>{t('milestoneReelLineupPreviewGroupIds')}:</span>{' '}
      {reel.groupIds.join(', ')}
    </p>
  )
}
