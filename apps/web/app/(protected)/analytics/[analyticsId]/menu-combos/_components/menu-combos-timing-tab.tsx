'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { HeatmapMatrix } from '../../heatmap/heatmap-matrix'
import {
  adaptComboDayMealHeatmap,
  adaptComboHourlyHeatmap,
  formatLift,
  pairLabel,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPairTiming } from '@/lib/graphql/queries/analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Separator } from '@workspace/ui/components/separator'
import { Tabs, TabsContent } from '@workspace/ui/components/tabs'
import { MenuCombosTimingPairSelector } from './menu-combos-timing-pair-selector'
import { MenuCombosTimingPeakSummary } from './menu-combos-timing-peak-summary'

type MenuCombosTimingTabProps = {
  topPairTiming: MenuComboPairTiming[]
  locale: string
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
}

type TimingPairPanelProps = {
  timing: MenuComboPairTiming
  locale: string
  dayMealLabels: ReturnType<typeof buildDayMealLabels>
  hourlyLabels: ReturnType<typeof buildHourlyLabels>
  t: ReturnType<typeof useTranslations>
}

function buildDayMealLabels(locale: string, t: ReturnType<typeof useTranslations>) {
  return {
    menuColumnLabel: t('timing.dayMeal.menuColumn'),
    legendLow: t('timing.dayMeal.legendLow'),
    legendHigh: t('timing.dayMeal.legendHigh'),
    unitsLabel: t('timing.dayMeal.unitsLabel'),
    totalsRowLabel: t('timing.dayMeal.totalsRowLabel'),
    sortHint: t('timing.dayMeal.sortHint'),
    scrollHint: t('timing.dayMeal.scrollHint'),
    explainTitle: t('timing.dayMeal.explainTitle'),
    explainBody: t('timing.dayMeal.explainBody'),
    cellAriaLabel: (mealPeriod: string, day: string, index: number) =>
      t('timing.dayMeal.cellAriaLabel', {
        mealPeriod,
        day,
        index: formatLift(index, locale),
      }),
    cellTooltip: (mealPeriod: string, day: string, index: number) =>
      t('timing.dayMeal.cellTooltip', {
        mealPeriod,
        day,
        index: formatLift(index, locale),
      }),
  }
}

function buildHourlyLabels(t: ReturnType<typeof useTranslations>) {
  return {
    menuColumnLabel: t('timing.hourly.menuColumn'),
    legendLow: t('timing.hourly.legendLow'),
    legendHigh: t('timing.hourly.legendHigh'),
    unitsLabel: t('timing.hourly.unitsLabel'),
    totalsRowLabel: t('timing.hourly.totalsRowLabel'),
    sortHint: t('timing.hourly.sortHint'),
    scrollHint: t('timing.hourly.scrollHint'),
    explainTitle: t('timing.hourly.explainTitle'),
    explainBody: t('timing.hourly.explainBody'),
    cellAriaLabel: (pair: string, hour: string, count: number) =>
      t('timing.hourly.cellAriaLabel', { pair, hour, count }),
    cellTooltip: (pair: string, hour: string, count: number) =>
      t('timing.hourly.cellTooltip', { pair, hour, count }),
  }
}

function MenuCombosTimingPairPanel({
  timing,
  locale,
  dayMealLabels,
  hourlyLabels,
  t,
}: TimingPairPanelProps) {
  const dayMealHeatmap = useMemo(() => {
    const heatmap = adaptComboDayMealHeatmap(timing.dayMealCells)
    return {
      ...heatmap,
      columnLabels: heatmap.columnLabels.map((day) => weekdayLabel(day.toLowerCase(), t)),
    }
  }, [timing.dayMealCells, t])

  const hourlyHeatmap = useMemo(
    () => adaptComboHourlyHeatmap(timing.hourlyCoOrders, pairLabel(timing)),
    [timing],
  )

  return (
    <div className="flex flex-col gap-8">
      <MenuCombosTimingPeakSummary timing={timing} locale={locale} />

      <HeatmapMatrix
        title={t('timing.dayMeal.title')}
        rows={dayMealHeatmap.rows}
        columnLabels={dayMealHeatmap.columnLabels}
        density="compact"
        variant="embedded"
        labels={dayMealLabels}
      />

      <Separator />

      <HeatmapMatrix
        title={t('timing.hourly.title')}
        rows={hourlyHeatmap.rows}
        columnLabels={hourlyHeatmap.columnLabels}
        density="compact"
        variant="embedded"
        labels={hourlyLabels}
      />
    </div>
  )
}

export function MenuCombosTimingTab({ topPairTiming, locale }: MenuCombosTimingTabProps) {
  const t = useTranslations('analytics.menuCombos')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const dayMealLabels = useMemo(() => buildDayMealLabels(locale, t), [locale, t])
  const hourlyLabels = useMemo(() => buildHourlyLabels(t), [t])

  if (topPairTiming.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="py-10">
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t('timing.empty.title')}</EmptyTitle>
              <EmptyDescription>{t('timing.empty.description')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-base">{t('timing.panelTitle')}</CardTitle>
        <CardDescription>{t('timing.panelDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs
          className="min-w-0"
          value={String(selectedIndex)}
          onValueChange={(value) => {
            setSelectedIndex(Number(value))
          }}
        >
          <div className="border-b bg-background px-4 py-4 md:px-6">
            <MenuCombosTimingPairSelector
              topPairTiming={topPairTiming}
              selectedIndex={selectedIndex}
              onSelectedIndexChange={setSelectedIndex}
            />
          </div>

          {topPairTiming.map((timing, index) => (
            <TabsContent
              key={`${timing.menuA}-${timing.menuB}-panel`}
              value={String(index)}
              className="mt-0 flex flex-col gap-8 px-4 py-6 focus-visible:outline-none md:px-6"
            >
              <MenuCombosTimingPairPanel
                timing={timing}
                locale={locale}
                dayMealLabels={dayMealLabels}
                hourlyLabels={hourlyLabels}
                t={t}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
