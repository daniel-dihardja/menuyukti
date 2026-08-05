'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  COMBO_WEEKDAYS,
  formatLift,
  formatMealPeriodWithHours,
  getOpportunityCellsForDay,
  postureBadgeClassName,
  type ComboWeekday,
  type OpportunityCell,
} from '@/lib/analytics/menu-combos-page-adapter'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { cn } from '@workspace/ui/lib/utils'

import { MenuCombosSlotIndexGauge } from './menu-combos-slot-index-gauge'
import { useCloseLabel } from '@/hooks/use-close-label'

type MenuCombosSlotDayExplorerProps = {
  cells: OpportunityCell[]
  locale: string
  defaultDay: ComboWeekday | null
  weekdayLabel: (day: string) => string
}

function postureLabel(
  posture: NonNullable<OpportunityCell['promoPosture']>,
  t: ReturnType<typeof useTranslations>,
): string {
  return t(`timing.strategy.posture.${posture}` as 'timing.strategy.posture.support')
}

function venueTierLabel(
  tier: OpportunityCell['venueRelativeDemand'],
  t: ReturnType<typeof useTranslations>,
): string {
  switch (tier) {
    case 'low':
      return t('timing.strategy.gauge.tierLow')
    case 'high':
      return t('timing.strategy.gauge.tierHigh')
    default:
      return t('timing.strategy.gauge.tierAverage')
  }
}

export function MenuCombosSlotDayExplorer({
  cells,
  locale,
  defaultDay,
  weekdayLabel,
}: MenuCombosSlotDayExplorerProps) {
  const t = useTranslations('analytics.menuCombos')
  const closeLabel = useCloseLabel()
  const initialDay = defaultDay ?? COMBO_WEEKDAYS[0]
  const [selectedDay, setSelectedDay] = useState<ComboWeekday>(initialDay)
  const [sheetCell, setSheetCell] = useState<OpportunityCell | null>(null)

  const dayCells = useMemo(
    () => getOpportunityCellsForDay(cells, selectedDay),
    [cells, selectedDay],
  )

  const peakDay = cells.find((cell) => cell.isPeak)?.day

  const tierLabels = {
    low: t('timing.strategy.gauge.tierLow'),
    average: t('timing.strategy.gauge.tierAverage'),
    high: t('timing.strategy.gauge.tierHigh'),
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium">{t('timing.strategy.dayExplorer.title')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('timing.strategy.dayExplorer.description')}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
        {COMBO_WEEKDAYS.map((day) => {
          const isSelected = day === selectedDay
          const isPeakDay = day === peakDay
          return (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              className="relative shrink-0"
              onClick={() => setSelectedDay(day)}
            >
              {weekdayLabel(day)}
              {isPeakDay ? (
                <span
                  className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </Button>
          )
        })}
      </div>

      <ul className="grid gap-2 lg:grid-cols-2">
        {dayCells.map((cell) => {
          const label = formatMealPeriodWithHours(cell.mealPeriodLabel, cell.mealPeriodHoursLabel)
          const hasData = cell.coOrderCount > 0 || cell.venueDemandIndex > 0

          return (
            <li key={`${cell.day}-${cell.mealPeriod}`}>
              <button
                type="button"
                className={cn(
                  'flex h-full w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                  cell.isPeak && 'border-primary/40 bg-primary/5',
                  hasData && 'hover:bg-muted/40',
                )}
                onClick={() => hasData && setSheetCell(cell)}
                disabled={!hasData}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  {hasData ? (
                    cell.isPeak && cell.promoPosture ? (
                      <Badge
                        className={cn(
                          'shrink-0 text-xs uppercase',
                          postureBadgeClassName(cell.promoPosture),
                        )}
                      >
                        {postureLabel(cell.promoPosture, t)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs font-normal">
                        {venueTierLabel(cell.venueRelativeDemand, t)}
                      </Badge>
                    )
                  ) : null}
                </div>
                {hasData ? (
                  <div className="grid gap-2">
                    {cell.pairCoOrderIndex > 0 ? (
                      <MenuCombosSlotIndexGauge
                        label={t('timing.strategy.pairIndexLabel')}
                        value={cell.pairCoOrderIndex}
                        locale={locale}
                        compact
                      />
                    ) : null}
                    {cell.venueDemandIndex > 0 ? (
                      <MenuCombosSlotIndexGauge
                        label={t('timing.strategy.venueDemandLabel')}
                        value={cell.venueDemandIndex}
                        locale={locale}
                        compact
                        venueTier={cell.venueRelativeDemand}
                        tierLabels={tierLabels}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('timing.strategy.dayExplorer.noData')}
                  </p>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <Sheet open={sheetCell != null} onOpenChange={(open) => !open && setSheetCell(null)}>
        <SheetContent
          side="bottom"
          closeLabel={closeLabel}
          className="max-h-[85vh] overflow-y-auto rounded-t-xl"
        >
          {sheetCell ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {weekdayLabel(sheetCell.day)} ·{' '}
                  {formatMealPeriodWithHours(
                    sheetCell.mealPeriodLabel,
                    sheetCell.mealPeriodHoursLabel,
                  )}
                </SheetTitle>
                <SheetDescription>
                  {t('timing.strategy.dayExplorer.sheetDescription')}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-4 px-1 pb-4">
                {sheetCell.isPeak && sheetCell.promoPosture ? (
                  <Badge
                    className={cn('w-fit uppercase', postureBadgeClassName(sheetCell.promoPosture))}
                  >
                    {postureLabel(sheetCell.promoPosture, t)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit">
                    {venueTierLabel(sheetCell.venueRelativeDemand, t)}
                  </Badge>
                )}
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('timing.strategy.pairIndexLabel')}</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatLift(sheetCell.pairCoOrderIndex, locale)}×
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('timing.strategy.venueDemandLabel')}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatLift(sheetCell.venueDemandIndex, locale)}×
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('timing.strategy.dayExplorer.coOrdersLabel')}
                    </dt>
                    <dd className="font-semibold tabular-nums">{sheetCell.coOrderCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('timing.strategy.dayExplorer.venueDemandTierLabel')}
                    </dt>
                    <dd className="font-semibold">
                      {venueTierLabel(sheetCell.venueRelativeDemand, t)}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
