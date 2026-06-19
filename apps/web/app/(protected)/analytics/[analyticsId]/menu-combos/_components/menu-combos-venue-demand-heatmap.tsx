'use client'

import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { HeatmapMatrix } from '../../heatmap/heatmap-matrix'
import {
  adaptSlotDemandHeatmap,
  COMBO_MEAL_PERIODS,
  COMBO_WEEKDAYS,
  formatLift,
  type ComboMealPeriod,
  type ComboWeekday,
  type PeakSlotHighlight,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { RelativeDemand, SlotDemandCell } from '@/lib/graphql/queries/analytics'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

type MenuCombosVenueDemandHeatmapProps = {
  slotDemandProfile: SlotDemandCell[]
  locale: string
  highlightCell: PeakSlotHighlight | null
  weekdayLabel: (day: string) => string
}

function tierLabel(tier: RelativeDemand, t: ReturnType<typeof useTranslations>): string {
  switch (tier) {
    case 'low':
      return t('timing.strategy.gauge.tierLow')
    case 'high':
      return t('timing.strategy.gauge.tierHigh')
    default:
      return t('timing.strategy.gauge.tierAverage')
  }
}

function VenueHeatmapContent({
  slotDemandProfile,
  locale,
  highlightCell,
  weekdayLabel,
}: MenuCombosVenueDemandHeatmapProps) {
  const t = useTranslations('analytics.menuCombos')

  const heatmap = useMemo(() => adaptSlotDemandHeatmap(slotDemandProfile), [slotDemandProfile])

  const cellBySlot = useMemo(() => {
    const map = new Map<string, SlotDemandCell>()
    for (const cell of slotDemandProfile) {
      map.set(`${cell.mealPeriod}:${cell.day}`, cell)
    }
    return map
  }, [slotDemandProfile])

  const columnLabels = heatmap.columnLabels.map((day) => weekdayLabel(day.toLowerCase()))

  const labels = useMemo(() => {
    const resolveCell = (rowKey: string, dayLabel: string): SlotDemandCell | undefined => {
      const colIndex = columnLabels.indexOf(dayLabel)
      if (colIndex < 0) return undefined
      const day = COMBO_WEEKDAYS[colIndex] as ComboWeekday
      const period = rowKey as ComboMealPeriod
      return cellBySlot.get(`${period}:${day}`)
    }

    return {
      menuColumnLabel: t('timing.strategy.venueHeatmap.menuColumn'),
      legendLow: t('timing.strategy.venueHeatmap.legendLow'),
      legendHigh: t('timing.strategy.venueHeatmap.legendHigh'),
      unitsLabel: t('timing.strategy.venueHeatmap.unitsLabel'),
      totalsRowLabel: t('timing.strategy.venueHeatmap.totalsRowLabel'),
      sortHint: t('timing.strategy.venueHeatmap.sortHint'),
      scrollHint: t('timing.strategy.venueHeatmap.scrollHint'),
      explainTitle: t('timing.strategy.venueHeatmap.explainTitle'),
      explainBody: t('timing.strategy.venueHeatmap.explainBody'),
      cellAriaLabel: (mealPeriod: string, day: string, index: number) =>
        t('timing.strategy.venueHeatmap.cellAriaLabel', {
          mealPeriod,
          day,
          index: formatLift(index, locale),
        }),
      cellTooltip: (mealPeriod: string, day: string, index: number) => {
        const row = heatmap.rows.find((candidate) => candidate.label === mealPeriod)
        const cell = row ? resolveCell(row.key, day) : undefined
        return t('timing.strategy.venueHeatmap.cellTooltip', {
          mealPeriod,
          day,
          index: formatLift(index, locale),
          tier: tierLabel(cell?.relativeDemand ?? 'average', t),
        })
      },
    }
  }, [cellBySlot, columnLabels, heatmap.rows, locale, t])

  return (
    <HeatmapMatrix
      rows={heatmap.rows}
      columnLabels={columnLabels}
      density="compact"
      variant="embedded"
      labels={labels}
      colorScale="venue"
      highlightCell={highlightCell}
      showTotalsRow={false}
      showExplanation
      rowKeyOrder={COMBO_MEAL_PERIODS}
    />
  )
}

export function MenuCombosVenueDemandHeatmap(props: MenuCombosVenueDemandHeatmapProps) {
  const t = useTranslations('analytics.menuCombos')

  return (
    <>
      <div className="hidden flex-col gap-3 md:flex">
        <div>
          <h3 className="text-sm font-medium">{t('timing.strategy.venueHeatmap.title')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('timing.strategy.venueHeatmap.description')}
          </p>
        </div>
        <VenueHeatmapContent {...props} />
      </div>

      <Collapsible className="md:hidden">
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-left text-sm font-medium',
            'hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180',
          )}
        >
          <span>{t('timing.strategy.venueHeatmap.collapsibleTrigger')}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {t('timing.strategy.venueHeatmap.description')}
          </p>
          <VenueHeatmapContent {...props} />
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
