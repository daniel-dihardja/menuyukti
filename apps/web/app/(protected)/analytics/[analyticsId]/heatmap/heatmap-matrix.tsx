'use client'

import clsx from 'clsx'
import { useMemo } from 'react'
import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { TableCell, TableRow } from '@workspace/ui/components/table'

export type HeatmapMatrixRow = {
  key: string
  label: string
  values: number[]
}

type Props = {
  title?: string
  rows: HeatmapMatrixRow[]
  columnLabels: string[]
  color?: 'red' | 'green' | 'blue'
  density?: 'comfortable' | 'compact'
  /** When false, column headers are not sortable and row order is preserved. Default true. */
  sortable?: boolean
}

/** Sort by Menu (label) or by column index (e.g. "0", "1"). */
type HeatmapSortKey = 'label' | string

export function HeatmapMatrix({
  title,
  rows,
  columnLabels,
  color = 'green',
  density = 'comfortable',
  sortable = true,
}: Props) {
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<HeatmapSortKey>('0', 'desc')

  /* ---------------------------------------------
   * Sorting logic: by row label or by column value
   * --------------------------------------------- */
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

  /* ---------------------------------------------
   * Color scaling
   * --------------------------------------------- */
  const allValues = displayRows.flatMap((r) => r.values)
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min || 1

  const getIntensity = (value: number) => (value - min) / range

  const getColor = (t: number) => {
    const alpha = 0.15 + t * 0.85
    if (color === 'red') return `rgba(239, 68, 68, ${alpha})`
    if (color === 'green') return `rgba(34, 197, 94, ${alpha})`
    return `rgba(59, 130, 246, ${alpha})`
  }

  const columns = useMemo(
    () => [
      {
        id: 'label' as const,
        label: 'Menu',
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
    [columnLabels],
  )

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium">{title}</h3>}

      <div className="border rounded-md">
        <div className="overflow-x-auto">
          <SortableTable<HeatmapSortKey>
            columns={columns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
            sortable={sortable}
          >
            {displayRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="max-w-[220px] text-sm font-medium truncate sticky left-0 z-10 bg-background">
                  {row.label}
                </TableCell>
                {row.values.map((value, i) => {
                  const t = getIntensity(value)
                  const bg = getColor(t)
                  const isDark = t > 0.75

                  return (
                    <TableCell
                      key={i}
                      className={clsx(
                        'text-center text-[11px] font-medium',
                        density === 'compact' ? 'h-8' : 'h-10',
                      )}
                      style={{
                        backgroundColor: bg,
                        color: isDark ? '#fff' : undefined,
                      }}
                      title={`${row.label} @ ${columnLabels[i]} → ${value}`}
                    >
                      {value > 0 ? value : ''}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </SortableTable>
        </div>
      </div>

      <div className="border rounded-md p-3 bg-muted/20 space-y-2">
        <p className="text-xs font-medium">Explainability</p>
        <p className="text-xs text-muted-foreground">
          Cell intensity reflects relative quantity for this view. Values are deterministic bucket
          counts by hour/day, not model predictions.
        </p>
        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
          <li title="Window with highest aggregated demand in the selected view.">
            Peak window: highest total quantity bucket.
          </li>
          <li title="Window with the lowest aggregated demand in the selected view.">
            Low window: lowest total quantity bucket.
          </li>
          <li title="Relative concentration of demand in one menu item compared with all visible rows.">
            Concentration risk: over-dependence on a single menu item.
          </li>
          <li title="Confidence should be downgraded when quality is warn/failed or freshness is stale.">
            Confidence is policy-aware and should follow readiness metadata.
          </li>
        </ul>
      </div>

      {sortable && (
        <p className="text-xs text-muted-foreground">
          Click a column header to sort. Click again to toggle ASC/DESC.
        </p>
      )}
    </div>
  )
}
