'use client'

import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatPeakHour } from '@/lib/analytics/campaign-signals-page-adapter'
import {
  deriveComboPairPeakSummary,
  formatMealPeriodWithHours,
  postureBadgeClassName,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPairTiming } from '@/lib/graphql/queries/analytics'
import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

import { MenuCombosSlotIndexGauge } from './menu-combos-slot-index-gauge'

type MenuCombosSlotStrategyHeroProps = {
  timing: MenuComboPairTiming
  locale: string
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
}

function postureLabel(
  posture: MenuComboPairTiming['promoPosture']['promoPosture'],
  t: ReturnType<typeof useTranslations>,
): string {
  return t(`timing.strategy.posture.${posture}` as 'timing.strategy.posture.support')
}

function heroSurfaceClass(posture: MenuComboPairTiming['promoPosture']['promoPosture']): string {
  switch (posture) {
    case 'support':
      return 'border-emerald-500/25 bg-emerald-500/5'
    case 'promote':
      return 'border-amber-500/25 bg-amber-500/5'
    default:
      return 'border-border bg-muted/20'
  }
}

export function MenuCombosSlotStrategyHero({ timing, locale }: MenuCombosSlotStrategyHeroProps) {
  const t = useTranslations('analytics.menuCombos')
  const peak = deriveComboPairPeakSummary(timing)
  const promo = timing.promoPosture
  const peakHourLabel = formatPeakHour(peak.peakHour, locale)

  const hasSlotPeak = peak.peakDay != null && peak.peakMealPeriodLabel != null
  const mealPeriod = hasSlotPeak
    ? formatMealPeriodWithHours(peak.peakMealPeriodLabel, peak.peakMealPeriodHoursLabel)
    : null

  let summaryText: string
  if (hasSlotPeak && peakHourLabel) {
    summaryText = t('timing.peakSummary', {
      day: weekdayLabel(peak.peakDay!, t),
      mealPeriod: mealPeriod!,
      hour: peakHourLabel,
    })
  } else if (hasSlotPeak) {
    summaryText = t('timing.peakSummaryNoHour', {
      day: weekdayLabel(peak.peakDay!, t),
      mealPeriod: mealPeriod!,
    })
  } else if (peakHourLabel) {
    summaryText = t('timing.peakSummaryHourOnly', { hour: peakHourLabel })
  } else {
    summaryText = t('timing.noPeakData')
  }

  const pairIndex = promo.pairCoOrderIndex ?? timing.recommendedWindow.coOrderIndex
  const venueIndex = promo.venueDemandIndex
  const showGauges = pairIndex != null || venueIndex != null

  const tierLabels = {
    low: t('timing.strategy.gauge.tierLow'),
    average: t('timing.strategy.gauge.tierAverage'),
    high: t('timing.strategy.gauge.tierHigh'),
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border p-4 md:p-5',
        heroSurfaceClass(promo.promoPosture),
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-foreground">{summaryText}</p>
        </div>
        {promo.promoPosture && promo.promoPosture !== 'insufficient_data' ? (
          <Badge
            className={cn(
              'w-fit shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide',
              postureBadgeClassName(promo.promoPosture),
            )}
          >
            {postureLabel(promo.promoPosture, t)}
          </Badge>
        ) : null}
      </div>

      {showGauges ? (
        <div className="flex flex-col gap-3 sm:max-w-lg">
          {pairIndex != null ? (
            <MenuCombosSlotIndexGauge
              label={t('timing.strategy.gauge.pairAtPeak')}
              value={pairIndex}
              locale={locale}
            />
          ) : null}
          {venueIndex != null ? (
            <MenuCombosSlotIndexGauge
              label={t('timing.strategy.gauge.venueAtPeak')}
              value={venueIndex}
              locale={locale}
              venueTier={promo.venueRelativeDemand}
              tierLabels={tierLabels}
            />
          ) : null}
        </div>
      ) : null}

      {promo.promoReason ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{promo.promoReason}</p>
      ) : null}
    </div>
  )
}
