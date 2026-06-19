'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  buildOpportunityCells,
  getPeakSlotHighlight,
  type ComboWeekday,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPairTiming, SlotDemandCell } from '@/lib/graphql/queries/analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Tabs, TabsContent } from '@workspace/ui/components/tabs'
import { MenuCombosTimingPairSelector } from './menu-combos-timing-pair-selector'
import { MenuCombosSlotStrategyHero } from './menu-combos-slot-strategy-hero'
import { MenuCombosSlotDayExplorer } from './menu-combos-slot-day-explorer'
import { MenuCombosVenueDemandHeatmap } from './menu-combos-venue-demand-heatmap'

type MenuCombosTimingTabProps = {
  topPairTiming: MenuComboPairTiming[]
  slotDemandProfile: SlotDemandCell[]
  locale: string
}

function weekdayLabel(day: string, t: ReturnType<typeof useTranslations>): string {
  return t(`timing.weekdays.${day}` as 'timing.weekdays.mon')
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
  topPairTiming,
  slotDemandProfile,
  locale,
}: MenuCombosTimingTabProps) {
  const t = useTranslations('analytics.menuCombos')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectedTiming = topPairTiming[selectedIndex]
  const venuePeakHighlight = useMemo(
    () => (selectedTiming ? getPeakSlotHighlight(selectedTiming) : null),
    [selectedTiming],
  )

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
          <div className="flex flex-col gap-4 border-b bg-background px-4 py-4 md:px-6">
            <MenuCombosTimingPairSelector
              topPairTiming={topPairTiming}
              selectedIndex={selectedIndex}
              onSelectedIndexChange={setSelectedIndex}
            />

            <MenuCombosVenueDemandHeatmap
              slotDemandProfile={slotDemandProfile}
              locale={locale}
              highlightCell={venuePeakHighlight}
              weekdayLabel={(day) => weekdayLabel(day, t)}
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
                slotDemandProfile={slotDemandProfile}
                locale={locale}
                t={t}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
