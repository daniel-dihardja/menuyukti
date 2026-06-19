'use client'

import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatPeakHour } from '@/lib/analytics/campaign-signals-page-adapter'
import {
  deriveComboPairPeakSummary,
  formatMealPeriodWithHours,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPairTiming } from '@/lib/graphql/queries/analytics'

type MenuCombosTimingPeakSummaryProps = {
  timing: MenuComboPairTiming
  locale: string
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
}

export function MenuCombosTimingPeakSummary({ timing, locale }: MenuCombosTimingPeakSummaryProps) {
  const t = useTranslations('analytics.menuCombos')
  const peak = deriveComboPairPeakSummary(timing)
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium leading-relaxed text-foreground">{summaryText}</p>
      </div>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        {hasSlotPeak || peakHourLabel ? <p>{t('timing.peakExplanationIntro')}</p> : null}
        <p>
          <span className="font-medium text-foreground">{t('timing.dayMeal.title')}: </span>
          {t('timing.peakExplanationDayMeal')}
        </p>
        <p>
          <span className="font-medium text-foreground">{t('timing.hourly.title')}: </span>
          {t('timing.peakExplanationHourly')}
        </p>
      </div>
    </div>
  )
}
