'use client'

import { Clock, Lightbulb } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  formatLift,
  formatMealPeriodWithHours,
  hasActionableTiming,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPair, MenuComboPairTiming } from '@/lib/graphql/queries/analytics'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type MenuCombosInsightHeroProps = {
  topPair: MenuComboPair
  topPairTiming?: MenuComboPairTiming | null
  locale: string
  matrixUnavailable?: boolean
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
}

export function MenuCombosInsightHero({
  topPair,
  topPairTiming = null,
  locale,
  matrixUnavailable = false,
}: MenuCombosInsightHeroProps) {
  const t = useTranslations('analytics.menuCombos')
  const window = topPairTiming?.recommendedWindow
  const showTiming =
    topPairTiming != null &&
    hasActionableTiming(topPairTiming) &&
    window?.bestDay &&
    window.bestMealPeriodLabel

  return (
    <Card className="gap-4 border-primary/30 bg-primary/5 py-5 shadow-none sm:py-6">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Lightbulb className="text-primary" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardDescription className="text-foreground/80">{t('insightTitle')}</CardDescription>
            <CardTitle className="text-lg leading-snug font-semibold break-words">
              {topPair.menuA}
              <span className="font-normal text-muted-foreground"> + </span>
              {topPair.menuB}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal tabular-nums">
            {t('hero.liftLabel', { lift: formatLift(topPair.lift, locale) })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          {t('insightTopPair', {
            menuA: topPair.menuA,
            menuB: topPair.menuB,
            lift: formatLift(topPair.lift, locale),
          })}
        </p>
        {showTiming && window ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-foreground">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {t('hero.bestPromoWindow', {
              day: weekdayLabel(window.bestDay!, t),
              mealPeriod: formatMealPeriodWithHours(
                window.bestMealPeriodLabel,
                window.bestMealPeriodHoursLabel,
              ),
            })}
          </p>
        ) : null}
        {matrixUnavailable ? (
          <p className="mt-2 text-xs text-muted-foreground">{t('matrixUnavailable')}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
