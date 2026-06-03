'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'

import type {
  PostLineupScheduleHints,
  ReelLineupHeroDish,
  ReelLineupReel,
} from '@/lib/graphql/node-schemas'

import {
  LINEUP_ROLE_BADGE_CLASS,
  LINEUP_STORYTELLING_BADGE_CLASS,
} from './post-lineup-preview-parts'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

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

type WeekdayName = PostLineupScheduleHints['preferredWeekdays'][number]

function weekdayLabel(day: WeekdayName, labels: Record<WeekdayName, string>): string {
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

type ReelLineupHeroDishesLayout = 'card' | 'bullet'

function ReelLineupHeroDishRow({
  layout,
  dishNumber,
  dish,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  layout: ReelLineupHeroDishesLayout
  dishNumber: number
  dish: ReelLineupHeroDish
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')
  const title =
    layout === 'bullet'
      ? dish.name
      : t('milestoneReelLineupPreviewHeroDishTitle', {
          number: dishNumber,
          dishName: dish.name,
        })
  const reelMoment = dish.reelMoment?.trim()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p
        className={
          layout === 'bullet'
            ? `${mp.body} font-medium text-foreground`
            : 'text-sm font-semibold text-foreground'
        }
      >
        {title}
      </p>
      {dish.role ? (
        <Badge variant="outline" className={LINEUP_ROLE_BADGE_CLASS[dish.role]}>
          {dish.role === 'star' ? roleStarLabel : rolePuzzleLabel}
        </Badge>
      ) : null}
      {dish.category?.trim() ? (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {dish.category.trim()}
        </Badge>
      ) : null}
      {reelMoment ? (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {reelMoment}
        </Badge>
      ) : null}
      {dish.storytellingFit ? (
        <Badge variant="outline" className={LINEUP_STORYTELLING_BADGE_CLASS[dish.storytellingFit]}>
          {dish.storytellingFit === 'strong'
            ? t('milestonePromotionCandidatesPreviewStorytellingStrong')
            : t('milestonePromotionCandidatesPreviewStorytellingWeak')}
        </Badge>
      ) : null}
      {typeof dish.popularity === 'number' ? (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {t('milestoneMenuClustererPreviewPopularityLabel', { value: dish.popularity })}
        </Badge>
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
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3">
      <ReelLineupHeroDishRow
        layout="card"
        dishNumber={dishNumber}
        dish={dish}
        roleStarLabel={roleStarLabel}
        rolePuzzleLabel={rolePuzzleLabel}
      />
    </div>
  )
}

export function ReelLineupHeroDishes({
  reel,
  roleStarLabel,
  rolePuzzleLabel,
  layout = 'card',
}: {
  reel: ReelLineupReel
  roleStarLabel: string
  rolePuzzleLabel: string
  layout?: ReelLineupHeroDishesLayout
}) {
  const heroDishes = reel.heroDishes ?? []
  if (heroDishes.length === 0) {
    return null
  }

  if (layout === 'bullet') {
    return (
      <ul className={`${mp.listDisc} flex flex-col gap-2`}>
        {heroDishes.map((dish, dishIndex) => (
          <li key={`${dish.name}-${dishIndex}`}>
            <ReelLineupHeroDishRow
              layout="bullet"
              dishNumber={dishIndex + 1}
              dish={dish}
              roleStarLabel={roleStarLabel}
              rolePuzzleLabel={rolePuzzleLabel}
            />
          </li>
        ))}
      </ul>
    )
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

export function ReelLineupDetailCard({
  reel,
  index,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  reel: ReelLineupReel
  index: number
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <Card className="gap-3 py-4 shadow-none">
      <CardHeader className="flex flex-col gap-2 px-4 pb-0">
        <CardTitle className="text-base">
          {t('milestoneReelLineupPreviewReelTitle', { number: index + 1, title: reel.title })}
        </CardTitle>
        <ReelLineupReelBadges reel={reel} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pt-0">
        <ReelLineupReelCopy reel={reel} />
        <ReelLineupHeroDishes
          reel={reel}
          layout="bullet"
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
        <ReelLineupReelMeta reel={reel} />
      </CardContent>
    </Card>
  )
}
