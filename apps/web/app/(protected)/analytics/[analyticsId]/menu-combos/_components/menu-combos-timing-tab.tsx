'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  buildOpportunityCells,
  buildTimingPairOptions,
  formatLift,
  getPeakSlotHighlight,
  pairLabel,
  type ComboWeekday,
} from '@/lib/analytics/menu-combos-page-adapter'
import type {
  MenuComboPair,
  MenuComboPairTiming,
  SlotDemandCell,
} from '@/lib/graphql/queries/analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { MenuCombosTimingPairSelector } from './menu-combos-timing-pair-selector'
import { MenuCombosSlotStrategyHero } from './menu-combos-slot-strategy-hero'
import { MenuCombosSlotDayExplorer } from './menu-combos-slot-day-explorer'
import { MenuCombosVenueDemandHeatmap } from './menu-combos-venue-demand-heatmap'

type MenuCombosTimingTabProps = {
  pairs: MenuComboPair[]
  topPairTiming: MenuComboPairTiming[]
  slotDemandProfile: SlotDemandCell[]
  locale: string
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
}

function timingPairKey(timing: Pick<MenuComboPairTiming, 'menuA' | 'menuB'>): string {
  return `${timing.menuA}::${timing.menuB}`
}

type TimingPairPanelProps = {
  timing: MenuComboPairTiming
  slotDemandProfile: SlotDemandCell[]
  locale: string
  t: ReturnType<typeof useTranslations>
}

function MenuCombosTimingPairPanel({ timing, slotDemandProfile, locale, t }: TimingPairPanelProps) {
  const opportunityCells = useMemo(
    () => buildOpportunityCells(timing, slotDemandProfile),
    [timing, slotDemandProfile],
  )

  const peakDay = (timing.recommendedWindow.bestDay as ComboWeekday | null) ?? null

  return (
    <div className="flex flex-col gap-8">
      <MenuCombosSlotStrategyHero timing={timing} locale={locale} />

      <MenuCombosSlotDayExplorer
        key={`${timing.menuA}-${timing.menuB}-explorer`}
        cells={opportunityCells}
        locale={locale}
        defaultDay={peakDay}
        weekdayLabel={(day) => weekdayLabel(day, t)}
      />
    </div>
  )
}

export function MenuCombosTimingTab({
  pairs,
  topPairTiming,
  slotDemandProfile,
  locale,
}: MenuCombosTimingTabProps) {
  const t = useTranslations('analytics.menuCombos')

  const timingPairOptions = useMemo(
    () => buildTimingPairOptions(pairs, topPairTiming),
    [pairs, topPairTiming],
  )

  const selectOptions = useMemo(
    () =>
      timingPairOptions.map((option) => ({
        value: timingPairKey(option.timing),
        label: t('timing.pairSelectorOption', {
          pair: pairLabel(option.timing),
          lift: formatLift(option.pair?.lift ?? 0, locale),
        }),
      })),
    [locale, t, timingPairOptions],
  )

  const [selectedValue, setSelectedValue] = useState(() => selectOptions[0]?.value ?? '')

  const resolvedSelectedValue = selectOptions.some((option) => option.value === selectedValue)
    ? selectedValue
    : (selectOptions[0]?.value ?? '')

  const selectedTiming = useMemo(
    () =>
      timingPairOptions.find((option) => timingPairKey(option.timing) === resolvedSelectedValue)
        ?.timing ?? null,
    [resolvedSelectedValue, timingPairOptions],
  )

  const venuePeakHighlight = useMemo(
    () => (selectedTiming ? getPeakSlotHighlight(selectedTiming) : null),
    [selectedTiming],
  )

  if (timingPairOptions.length === 0) {
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
        <div className="flex flex-col gap-4 border-b bg-background px-4 py-4 md:px-6">
          <MenuCombosTimingPairSelector
            options={selectOptions}
            selectedValue={resolvedSelectedValue}
            onSelectedValueChange={setSelectedValue}
          />

          <MenuCombosVenueDemandHeatmap
            slotDemandProfile={slotDemandProfile}
            locale={locale}
            highlightCell={venuePeakHighlight}
            weekdayLabel={(day) => weekdayLabel(day, t)}
          />
        </div>

        {selectedTiming ? (
          <div className="flex flex-col gap-8 px-4 py-6 md:px-6">
            <MenuCombosTimingPairPanel
              timing={selectedTiming}
              slotDemandProfile={slotDemandProfile}
              locale={locale}
              t={t}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
