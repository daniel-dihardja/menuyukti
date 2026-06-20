'use client'

import { useMemo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'
import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import {
  computeColumnTotals,
  computeScaleBounds,
  findPeakColumnIndex,
} from '@/lib/analytics/heatmap-insights'
import {
  heatmapCellBackground,
  heatmapCellUsesLightText,
  heatmapIntensity,
  venueDemandCellBackground,
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
  /** Shown above the table on small screens when horizontal scroll is needed. */
  scrollHint?: string
  cellAriaLabel: (menu: string, window: string, count: number) => string
  cellTooltip: (menu: string, window: string, count: number) => string
}

export type HeatmapHighlightCell = {
  rowKey: string
  columnIndex: number
}

type Props = {
  title?: string
  rows: HeatmapMatrixRow[]
  columnLabels: string[]
  density?: 'comfortable' | 'compact'
  sortable?: boolean
  defaultSortColumnIndex?: number
  /** When true, cells where row label matches column label render as an em dash. */
  maskDiagonal?: boolean
  labels: HeatmapMatrixLabels
  /** `embedded` drops the Card wrapper for use inside a parent section. */
  variant?: 'card' | 'embedded'
  /** When false, hides the explanation alert below the table. Defaults to true for card, false for embedded. */
  showExplanation?: boolean
  /** Sequential (chart-2) or venue demand (chart-4, light = weak, dark = strong). */
  colorScale?: 'sequential' | 'venue'
  /** Highlights a cell with a primary ring (e.g. pair peak slot). */
  highlightCell?: HeatmapHighlightCell | null
  /** When false, hides the totals row. Defaults to true. */
  showTotalsRow?: boolean
  /** When set, sorting the row label column uses this key order instead of alphabetical. */
  rowKeyOrder?: readonly string[]
}

/** Sort by Menu (label) or by column index (e.g. "0", "1"). */
type HeatmapSortKey = 'label' | string

const STICKY_EDGE =
  'border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.35)]'

const STICKY_COLUMN_WIDTH = 'min-w-32 max-w-32 md:min-w-[220px] md:max-w-[220px]'

const DATA_COLUMN_CLASS = 'min-w-11'

const STICKY_HEADER_LABEL = cn('sticky left-0 z-20 h-10 bg-muted', STICKY_COLUMN_WIDTH, STICKY_EDGE)

const STICKY_ROW_LABEL = cn(
  'sticky left-0 z-10 truncate bg-card text-sm font-medium',
  STICKY_COLUMN_WIDTH,
  STICKY_EDGE,
)

const STICKY_TOTALS_LABEL = cn(
  'sticky left-0 z-10 bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  STICKY_COLUMN_WIDTH,
  STICKY_EDGE,
)

const HOUR_LABEL_RE = /^(\d{1,2}):\d{2}$/

function shortenHourLabel(label: string): string {
  const match = HOUR_LABEL_RE.exec(label)
  return match ? match[1]! : label
}

export function HeatmapMatrix({
  title,
  rows,
  columnLabels,
  density = 'comfortable',
  sortable = true,
  defaultSortColumnIndex = 0,
  maskDiagonal = false,
  labels,
  variant = 'card',
  showExplanation,
  colorScale = 'sequential',
  highlightCell = null,
  showTotalsRow = true,
  rowKeyOrder,
}: Props) {
  const isEmbedded = variant === 'embedded'
  const showExplainBlock = showExplanation ?? !isEmbedded
  const isMobile = useCompactLayout()
  const initialSortKey = String(defaultSortColumnIndex) as HeatmapSortKey
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<HeatmapSortKey>(
    initialSortKey,
    'desc',
  )

  const sortedRows = useMemo(() => {
    if (sortKey === 'label') {
      return [...rows].sort((a, b) => {
        let cmp: number
        if (rowKeyOrder) {
          const aIndex = rowKeyOrder.indexOf(a.key)
          const bIndex = rowKeyOrder.indexOf(b.key)
          const aRank = aIndex >= 0 ? aIndex : rowKeyOrder.length
          const bRank = bIndex >= 0 ? bIndex : rowKeyOrder.length
          cmp = aRank - bRank
        } else {
          cmp = a.label.localeCompare(b.label)
        }
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
  }, [rows, sortKey, sortDirection, rowKeyOrder])

  const displayRows = sortable ? sortedRows : rows

  const scaleRows = useMemo(() => {
    if (!maskDiagonal) return displayRows
    return displayRows.map((row) => ({
      ...row,
      values: row.values.map((value, i) => (row.label === columnLabels[i] ? 0 : value)),
    }))
  }, [columnLabels, displayRows, maskDiagonal])

  const { min, max } = useMemo(() => {
    if (!maskDiagonal) return computeScaleBounds(displayRows)
    const offDiagonal = displayRows.flatMap((row) =>
      row.values.filter((_, i) => row.label !== columnLabels[i]),
    )
    if (offDiagonal.length === 0) return { min: 0, max: 1 }
    return {
      min: Math.min(...offDiagonal),
      max: Math.max(...offDiagonal),
    }
  }, [columnLabels, displayRows, maskDiagonal])

  const columnTotals = useMemo(() => computeColumnTotals(scaleRows), [scaleRows])
  const peakColumnIndex = useMemo(() => findPeakColumnIndex(columnTotals), [columnTotals])

  const displayColumnLabels = useMemo(
    () => (isMobile ? columnLabels.map(shortenHourLabel) : columnLabels),
    [columnLabels, isMobile],
  )

  const columns = useMemo(
    () => [
      {
        id: 'label' as const,
        label: labels.menuColumnLabel,
        align: 'left' as const,
        className: STICKY_HEADER_LABEL,
      },
      ...displayColumnLabels.map((label, i) => ({
        id: String(i),
        label,
        align: 'center' as const,
        className: cn('h-10', DATA_COLUMN_CLASS),
      })),
    ],
    [displayColumnLabels, labels.menuColumnLabel],
  )

  const isVenueScale = colorScale === 'venue'
  const legendGradient = isVenueScale
    ? 'bg-gradient-to-r from-chart-4/15 via-chart-4/50 to-chart-4'
    : 'bg-gradient-to-r from-chart-2/15 via-chart-2/50 to-chart-2'

  const matrixBody = (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{labels.unitsLabel}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{labels.legendLow}</span>
          <span className="text-muted-foreground/80">{isVenueScale ? min.toFixed(2) : min}</span>
          <div
            className={cn('h-2 min-w-[8rem] flex-1 rounded', legendGradient)}
            aria-hidden="true"
          />
          <span className="text-muted-foreground/80">{isVenueScale ? max.toFixed(2) : max}</span>
          <span>{labels.legendHigh}</span>
        </div>
      </div>

      {labels.scrollHint ? (
        <p className="text-xs text-muted-foreground lg:hidden">{labels.scrollHint}</p>
      ) : null}

      <div className="rounded-md border">
        <TooltipProvider delayDuration={300}>
          <SortableTable<HeatmapSortKey>
            columns={columns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
            sortable={sortable}
            headerRowClassName="bg-muted hover:bg-muted"
          >
            {displayRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className={STICKY_ROW_LABEL}>{row.label}</TableCell>
                {row.values.map((value, i) => {
                  const windowLabel = columnLabels[i] ?? String(i)
                  const isDiagonal = maskDiagonal && row.label === windowLabel
                  const intensity = heatmapIntensity(value, min, max)
                  const isHighlighted =
                    highlightCell != null &&
                    highlightCell.rowKey === row.key &&
                    highlightCell.columnIndex === i
                  const ariaLabel = labels.cellAriaLabel(row.label, windowLabel, value)
                  const tooltipText = labels.cellTooltip(row.label, windowLabel, value)
                  const displayValue = value > 0 ? (isVenueScale ? value.toFixed(2) : value) : ''

                  return (
                    <TableCell
                      key={`${row.key}-${windowLabel}`}
                      className={cn(
                        'text-center text-[11px] font-medium',
                        DATA_COLUMN_CLASS,
                        density === 'compact' ? 'h-8' : 'h-10',
                        isDiagonal && 'bg-muted/30 text-muted-foreground',
                        !isDiagonal &&
                          heatmapCellUsesLightText(intensity) &&
                          'text-primary-foreground',
                        isHighlighted && 'ring-2 ring-primary ring-offset-1',
                      )}
                      style={
                        isDiagonal
                          ? undefined
                          : {
                              backgroundColor: isVenueScale
                                ? venueDemandCellBackground(intensity)
                                : heatmapCellBackground(intensity),
                            }
                      }
                      aria-label={ariaLabel}
                    >
                      {isDiagonal ? (
                        '—'
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex size-full items-center justify-center">
                              {displayValue}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{tooltipText}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            {showTotalsRow ? (
              <TableRow className="bg-muted hover:bg-muted">
                <TableCell className={STICKY_TOTALS_LABEL}>{labels.totalsRowLabel}</TableCell>
                {columnTotals.map((total, i) => {
                  const isPeak = peakColumnIndex === i && total > 0
                  return (
                    <TableCell
                      key={`total-${columnLabels[i] ?? i}`}
                      className={cn(
                        'text-center text-xs font-semibold text-muted-foreground',
                        DATA_COLUMN_CLASS,
                        density === 'compact' ? 'h-8' : 'h-10',
                        isPeak && 'bg-chart-2/20 font-bold text-foreground ring-1 ring-chart-2/40',
                      )}
                    >
                      {total > 0 ? total : '—'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ) : null}
          </SortableTable>
        </TooltipProvider>
      </div>

      {showExplainBlock ? (
        <Alert>
          <AlertTitle className="text-xs">{labels.explainTitle}</AlertTitle>
          <AlertDescription className="text-xs">{labels.explainBody}</AlertDescription>
        </Alert>
      ) : null}

      {sortable ? <p className="text-xs text-muted-foreground">{labels.sortHint}</p> : null}
    </>
  )

  if (isEmbedded) {
    return (
      <div className="flex flex-col gap-3">
        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
        {matrixBody}
      </div>
    )
  }

  return (
    <Card className="gap-4 py-4">
      {title ? (
        <CardHeader className="gap-1 px-4 pb-0">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}

      <CardContent className="flex flex-col gap-3 px-4">{matrixBody}</CardContent>
    </Card>
  )
}

export type HeatmapMatrixCoreProps = Omit<Props, 'variant' | 'showExplanation' | 'showTotalsRow'>

/** Card-wrapped heatmap with explanation and totals row enabled by default. */
export function HeatmapMatrixCard(props: HeatmapMatrixCoreProps) {
  return <HeatmapMatrix {...props} showExplanation showTotalsRow variant="card" />
}

/** Embedded heatmap for parent sections; explanation hidden by default. */
export function HeatmapMatrixEmbedded(
  props: HeatmapMatrixCoreProps & { showTotalsRow?: boolean; showExplanation?: boolean },
) {
  const { showTotalsRow = true, showExplanation = false, ...rest } = props
  return (
    <HeatmapMatrix
      {...rest}
      showExplanation={showExplanation}
      showTotalsRow={showTotalsRow}
      variant="embedded"
    />
  )
}
