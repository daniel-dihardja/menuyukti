'use client'

import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { HeatmapMatrix } from '../../heatmap/heatmap-matrix'
import {
  adaptComboDayMealHeatmap,
  adaptComboHourlyHeatmap,
  formatLift,
  formatRecommendedWindowShort,
  hasActionableTiming,
  pairLabel,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPairTiming } from '@/lib/graphql/queries/analytics'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Separator } from '@workspace/ui/components/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { MenuCombosTimingWindowCard } from './menu-combos-timing-window-card'

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
    <div className="flex flex-col gap-6">
      <section aria-labelledby="timing-recommendation-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="timing-recommendation-heading" className="text-sm font-medium">
            {t('timing.sections.recommendation')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('timing.sections.recommendationHint')}</p>
        </div>
        <MenuCombosTimingWindowCard timing={timing} locale={locale} variant="inset" />
      </section>

      <Separator />

      <section aria-labelledby="timing-heatmap-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="timing-heatmap-heading" className="text-sm font-medium">
            {t('timing.sections.heatmap')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('timing.sections.heatmapHint')}</p>
        </div>
        <HeatmapMatrix
          title={t('timing.dayMeal.title')}
          rows={dayMealHeatmap.rows}
          columnLabels={dayMealHeatmap.columnLabels}
          density="compact"
          labels={dayMealLabels}
        />
      </section>

      <section aria-labelledby="timing-hourly-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="timing-hourly-heading" className="text-sm font-medium">
            {t('timing.sections.hourly')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('timing.sections.hourlyHint')}</p>
        </div>
        <Collapsible className="overflow-hidden rounded-lg border border-dashed">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="group h-auto w-full justify-between rounded-none px-4 py-3 text-left font-normal"
            >
              <span>{t('timing.hourly.showDetail')}</span>
              <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t px-2 pb-2 pt-2 sm:px-4">
            <HeatmapMatrix
              title={t('timing.hourly.title')}
              rows={hourlyHeatmap.rows}
              columnLabels={hourlyHeatmap.columnLabels}
              density="compact"
              labels={hourlyLabels}
            />
          </CollapsibleContent>
        </Collapsible>
      </section>

      {!hasActionableTiming(timing) ? (
        <p className="text-sm text-muted-foreground">{t('timing.lowSampleNote')}</p>
      ) : null}
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
          value={String(selectedIndex)}
          onValueChange={(value) => {
            setSelectedIndex(Number(value))
          }}
        >
          <div className="border-b bg-background px-4 py-4 md:px-6">
            <Field>
              <FieldLabel className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('timing.pairSelectorLabel')}
              </FieldLabel>
              <TabsList className="mt-2 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
                {topPairTiming.map((timing, index) => {
                  const windowLabel = formatRecommendedWindowShort(timing, (day) =>
                    weekdayLabel(day, t),
                  )
                  return (
                    <TabsTrigger
                      key={`${timing.menuA}-${timing.menuB}`}
                      value={String(index)}
                      className="h-auto max-w-full py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                        <span className="truncate font-medium">{pairLabel(timing)}</span>
                        {windowLabel ? (
                          <span className="truncate text-xs font-normal text-muted-foreground">
                            {windowLabel}
                          </span>
                        ) : null}
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Field>
          </div>

          {topPairTiming.map((timing, index) => (
            <TabsContent
              key={`${timing.menuA}-${timing.menuB}-panel`}
              value={String(index)}
              className="mt-0 px-4 py-6 focus-visible:outline-none md:px-6"
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
