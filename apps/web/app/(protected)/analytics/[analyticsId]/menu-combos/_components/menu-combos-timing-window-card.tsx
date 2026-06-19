'use client'

import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatLift, formatMealPeriodWithHours } from '@/lib/analytics/menu-combos-page-adapter'
import { formatPeakHour } from '@/lib/analytics/campaign-signals-page-adapter'
import type { MenuComboPairTiming } from '@/lib/graphql/queries/analytics'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

type MenuCombosTimingWindowCardProps = {
  timing: MenuComboPairTiming
  locale: string
  variant?: 'card' | 'inset'
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
}

function RecommendationBody({
  timing,
  locale,
  t,
}: {
  timing: MenuComboPairTiming
  locale: string
  t: ReturnType<typeof useTranslations>
}) {
  const window = timing.recommendedWindow
  const peakHourLabel = formatPeakHour(window.peakHour, locale)

  if (window.confidenceTier === 'insufficient') {
    return (
      <>
        <CardDescription>{t('timing.recommendationTitle')}</CardDescription>
        <CardTitle className="text-base font-medium">{t('timing.insufficientData')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('timing.insufficientDescription')}</p>
      </>
    )
  }

  const bestDay = window.bestDay ? weekdayLabel(window.bestDay, t) : '—'
  const mealPeriod = formatMealPeriodWithHours(
    window.bestMealPeriodLabel,
    window.bestMealPeriodHoursLabel,
  )

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <CardDescription>{t('timing.recommendationTitle')}</CardDescription>
          <CardTitle className="text-lg leading-snug font-semibold">
            {t('timing.recommendationBody', {
              menuA: timing.menuA,
              menuB: timing.menuB,
              day: bestDay,
              mealPeriod,
            })}
          </CardTitle>
        </div>
        <Badge variant="secondary" className="shrink-0 font-normal">
          {t(`timing.confidence.${window.confidenceTier}`)}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {window.coOrderIndex != null ? (
          <span>
            {t('timing.indexLabel', {
              index: formatLift(window.coOrderIndex, locale),
            })}
          </span>
        ) : null}
        <span>
          {t('timing.sampleLabel', {
            count: window.sampleCoOrders,
          })}
        </span>
        {peakHourLabel ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            {t('timing.peakHourLabel', { hour: peakHourLabel })}
          </span>
        ) : null}
      </div>
    </>
  )
}

export function MenuCombosTimingWindowCard({
  timing,
  locale,
  variant = 'card',
}: MenuCombosTimingWindowCardProps) {
  const t = useTranslations('analytics.menuCombos')

  if (variant === 'inset') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border bg-muted/20 p-4',
          timing.recommendedWindow.confidenceTier !== 'insufficient' && 'border-primary/20',
        )}
      >
        <RecommendationBody timing={timing} locale={locale} t={t} />
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'shadow-none',
        timing.recommendedWindow.confidenceTier !== 'insufficient' && 'border-primary/20',
      )}
    >
      <CardHeader className="gap-3">
        <RecommendationBody timing={timing} locale={locale} t={t} />
      </CardHeader>
    </Card>
  )
}
