'use client'

import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { HeatmapMatrixEmbeddedExplained } from '../../heatmap/heatmap-matrix'
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
  translationNamespace?: string
  translationPrefix?: string
  gaugePrefix?: string
  collapsibleOnMobile?: boolean
}

function tierLabel(
  tier: RelativeDemand,
  t: ReturnType<typeof useTranslations>,
  gaugePrefix: string,
): string {
  switch (tier) {
    case 'low':
      return t(`${gaugePrefix}.tierLow`)
    case 'high':
      return t(`${gaugePrefix}.tierHigh`)
    default:
      return t(`${gaugePrefix}.tierAverage`)
  }
}

function VenueHeatmapContent({
  slotDemandProfile,
  locale,
  highlightCell,
  weekdayLabel,
  translationNamespace = 'analytics.menuCombos',
  translationPrefix = 'timing.strategy.venueHeatmap',
  gaugePrefix = 'timing.strategy.gauge',
}: MenuCombosVenueDemandHeatmapProps) {
  const t = useTranslations(translationNamespace)

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
      menuColumnLabel: t(`${translationPrefix}.menuColumn`),
      legendLow: t(`${translationPrefix}.legendLow`),
      legendHigh: t(`${translationPrefix}.legendHigh`),
      unitsLabel: t(`${translationPrefix}.unitsLabel`),
      totalsRowLabel: t(`${translationPrefix}.totalsRowLabel`),
      sortHint: t(`${translationPrefix}.sortHint`),
      scrollHint: t(`${translationPrefix}.scrollHint`),
      explainTitle: t(`${translationPrefix}.explainTitle`),
      explainBody: t(`${translationPrefix}.explainBody`),
      cellAriaLabel: (mealPeriod: string, day: string, index: number) => {
        const row = heatmap.rows.find((candidate) => candidate.label === mealPeriod)
        const cell = row ? resolveCell(row.key, day) : undefined
        return t(`${translationPrefix}.cellAriaLabel`, {
          mealPeriod,
          day,
          orderCount: cell?.orderCount ?? 0,
          index: formatLift(index, locale),
        })
      },
      cellTooltip: (mealPeriod: string, day: string, index: number) => {
        const row = heatmap.rows.find((candidate) => candidate.label === mealPeriod)
        const cell = row ? resolveCell(row.key, day) : undefined
        return t(`${translationPrefix}.cellTooltip`, {
          mealPeriod,
          day,
          orderCount: cell?.orderCount ?? 0,
          index: formatLift(index, locale),
          tier: tierLabel(cell?.relativeDemand ?? 'average', t, gaugePrefix),
        })
      },
    }
  }, [cellBySlot, columnLabels, gaugePrefix, heatmap.rows, locale, t, translationPrefix])

  return (
    <HeatmapMatrixEmbeddedExplained
      rows={heatmap.rows}
      columnLabels={columnLabels}
      density="compact"
      labels={labels}
      colorScale="venue"
      highlightCell={highlightCell}
      rowKeyOrder={COMBO_MEAL_PERIODS}
    />
  )
}

export function MenuCombosVenueDemandHeatmap({
  translationNamespace = 'analytics.menuCombos',
  translationPrefix = 'timing.strategy.venueHeatmap',
  gaugePrefix = 'timing.strategy.gauge',
  collapsibleOnMobile = true,
  ...props
}: MenuCombosVenueDemandHeatmapProps) {
  const t = useTranslations(translationNamespace)
  const contentProps = {
    ...props,
    translationNamespace,
    translationPrefix,
    gaugePrefix,
  }

  const header = (
    <div>
      <h3 className="text-sm font-medium">{t(`${translationPrefix}.title`)}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t(`${translationPrefix}.description`)}</p>
    </div>
  )

  if (!collapsibleOnMobile) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <VenueHeatmapContent {...contentProps} />
      </div>
    )
  }

  return (
    <>
      <div className="hidden flex-col gap-3 md:flex">
        {header}
        <VenueHeatmapContent {...contentProps} />
      </div>

      <Collapsible className="md:hidden">
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-left text-sm font-medium',
            'hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180',
          )}
        >
          <span>{t(`${translationPrefix}.collapsibleTrigger`)}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t(`${translationPrefix}.description`)}</p>
          <VenueHeatmapContent {...contentProps} />
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
