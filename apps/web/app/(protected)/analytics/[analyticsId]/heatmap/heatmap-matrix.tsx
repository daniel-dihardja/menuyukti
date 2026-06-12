'use client'

import { useMemo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'
import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import {
  computeColumnTotals,
  computeScaleBounds,
  findPeakColumnIndex,
} from '@/lib/analytics/heatmap-insights'
import {
  heatmapCellBackground,
  heatmapCellUsesLightText,
  heatmapIntensity,
} from '@/lib/analytics/heatmap-scale'

export type HeatmapMatrixRow = {
  key: string
  label: string
  values: number[]
}

type HeatmapMatrixLabels = {
  menuColumnLabel: string
  legendLow: string
  legendHigh: string
  unitsLabel: string
  totalsRowLabel: string
  sortHint: string
  explainTitle: string
  explainBody: string
  cellAriaLabel: (menu: string, window: string, count: number) => string
  cellTooltip: (menu: string, window: string, count: number) => string
}

type Props = {
  title?: string
  rows: HeatmapMatrixRow[]
  columnLabels: string[]
  density?: 'comfortable' | 'compact'
  sortable?: boolean
  defaultSortColumnIndex?: number
  labels: HeatmapMatrixLabels
}

/** Sort by Menu (label) or by column index (e.g. "0", "1"). */
type HeatmapSortKey = 'label' | string

export function HeatmapMatrix({
  title,
  rows,
  columnLabels,
  density = 'comfortable',
  sortable = true,
  defaultSortColumnIndex = 0,
  labels,
}: Props) {
  const initialSortKey = String(defaultSortColumnIndex) as HeatmapSortKey
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<HeatmapSortKey>(
    initialSortKey,
    'desc',
  )

  const sortedRows = useMemo(() => {
    if (sortKey === 'label') {
      return [...rows].sort((a, b) => {
        const cmp = a.label.localeCompare(b.label)
        return sortDirection === 'asc' ? cmp : -cmp
      })
    }
    const columnIndex = parseInt(sortKey, 10)
    if (Number.isNaN(columnIndex)) return rows

    return [...rows].sort((a, b) => {
      const aVal = a.values[columnIndex] ?? 0
      const bVal = b.values[columnIndex] ?? 0
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [rows, sortKey, sortDirection])

  const displayRows = sortable ? sortedRows : rows

  const { min, max } = useMemo(() => computeScaleBounds(displayRows), [displayRows])
  const columnTotals = useMemo(() => computeColumnTotals(displayRows), [displayRows])
  const peakColumnIndex = useMemo(() => findPeakColumnIndex(columnTotals), [columnTotals])

  const columns = useMemo(
    () => [
      {
        id: 'label' as const,
        label: labels.menuColumnLabel,
        align: 'left' as const,
        className: 'min-w-[220px] sticky left-0 z-10 bg-muted/40 h-10',
      },
      ...columnLabels.map((label, i) => ({
        id: String(i),
        label,
        align: 'center' as const,
        className: 'h-10 min-w-0',
      })),
    ],
    [columnLabels, labels.menuColumnLabel],
  )

  return (
    <Card className="gap-4 py-4">
      {title ? (
        <CardHeader className="gap-1 px-4 pb-0">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}

      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex flex-col gap-1">
          <CardDescription className="text-xs">{labels.unitsLabel}</CardDescription>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{labels.legendLow}</span>
            <span className="text-muted-foreground/80">{min}</span>
            <div
              className="h-2 min-w-[8rem] flex-1 rounded bg-gradient-to-r from-chart-2/15 via-chart-2/50 to-chart-2"
              aria-hidden="true"
            />
            <span className="text-muted-foreground/80">{max}</span>
            <span>{labels.legendHigh}</span>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={300}>
              <SortableTable<HeatmapSortKey>
                columns={columns}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                sortable={sortable}
              >
                {displayRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="sticky left-0 z-10 max-w-[220px] truncate bg-background text-sm font-medium">
                      {row.label}
                    </TableCell>
                    {row.values.map((value, i) => {
                      const intensity = heatmapIntensity(value, min, max)
                      const windowLabel = columnLabels[i] ?? String(i)
                      const ariaLabel = labels.cellAriaLabel(row.label, windowLabel, value)
                      const tooltipText = labels.cellTooltip(row.label, windowLabel, value)

                      return (
                        <TableCell
                          key={`${row.key}-${windowLabel}`}
                          className={cn(
                            'text-center text-[11px] font-medium',
                            density === 'compact' ? 'h-8' : 'h-10',
                            heatmapCellUsesLightText(intensity) && 'text-primary-foreground',
                          )}
                          style={{ backgroundColor: heatmapCellBackground(intensity) }}
                          aria-label={ariaLabel}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex size-full items-center justify-center">
                                {value > 0 ? value : ''}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">{tooltipText}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {labels.totalsRowLabel}
                  </TableCell>
                  {columnTotals.map((total, i) => {
                    const isPeak = peakColumnIndex === i && total > 0
                    return (
                      <TableCell
                        key={`total-${columnLabels[i] ?? i}`}
                        className={cn(
                          'text-center text-xs font-semibold text-muted-foreground',
                          density === 'compact' ? 'h-8' : 'h-10',
                          isPeak &&
                            'bg-chart-2/20 font-bold text-foreground ring-1 ring-chart-2/40',
                        )}
                      >
                        {total > 0 ? total : '—'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              </SortableTable>
            </TooltipProvider>
          </div>
        </div>

        <Alert>
          <AlertTitle className="text-xs">{labels.explainTitle}</AlertTitle>
          <AlertDescription className="text-xs">{labels.explainBody}</AlertDescription>
        </Alert>

        {sortable ? <p className="text-xs text-muted-foreground">{labels.sortHint}</p> : null}
      </CardContent>
    </Card>
  )
}
