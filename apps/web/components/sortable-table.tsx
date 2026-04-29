'use client'

import { type ReactNode, useState } from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'

export type SortDirection = 'asc' | 'desc'

export function useSortableColumns<SortKey extends string>(
  initialSortKey: SortKey,
  initialSortDirection: SortDirection = 'desc',
) {
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection)

  const toggleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('desc')
  }

  return {
    sortKey,
    sortDirection,
    toggleSort,
  }
}

function sortIndicator(active: boolean, direction: SortDirection): string {
  if (!active) return ''
  return direction === 'asc' ? ' ▲' : ' ▼'
}

type SortableTableHeadProps = {
  active: boolean
  direction: SortDirection
  onToggle: () => void
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}

export function SortableTableHead({
  active,
  direction,
  onToggle,
  children,
  align = 'right',
  className,
}: SortableTableHeadProps) {
  return (
    <TableHead
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'select-none whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex w-full cursor-pointer items-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          align === 'left' && 'justify-start',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
        )}
      >
        {children}
        {sortIndicator(active, direction)}
      </button>
    </TableHead>
  )
}

/* ==================================================
 * Reusable sortable table (header from config + body slot)
 * ================================================== */

export type SortableTableColumn<SortKey extends string = string> = {
  id: SortKey
  label: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  /** When false, renders a plain TableHead (no sort). Default true. */
  sortable?: boolean
}

type SortableTableProps<SortKey extends string> = {
  columns: SortableTableColumn<SortKey>[]
  sortKey: SortKey
  sortDirection: SortDirection
  onSort: (key: SortKey) => void
  /** When false, all column headers are non-sortable. Default true. */
  sortable?: boolean
  caption?: ReactNode
  headerRowClassName?: string
  children: ReactNode
}

export function SortableTable<SortKey extends string>({
  columns,
  sortKey,
  sortDirection,
  onSort,
  sortable = true,
  caption,
  headerRowClassName,
  children,
}: SortableTableProps<SortKey>) {
  return (
    <Table>
      {caption != null ? <caption className="sr-only">{caption}</caption> : null}
      <TableHeader>
        <TableRow className={cn('bg-muted/40 hover:bg-muted/40', headerRowClassName)}>
          {columns.map((col) =>
            sortable && col.sortable !== false ? (
              <SortableTableHead
                key={col.id}
                active={sortKey === col.id}
                direction={sortDirection}
                onToggle={() => onSort(col.id)}
                align={col.align ?? 'right'}
                className={col.className}
              >
                {col.label}
              </SortableTableHead>
            ) : (
              <TableHead
                key={col.id}
                className={cn(
                  'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                  col.align === 'left' && 'text-left',
                  col.align === 'right' && 'text-right',
                  (col.align === 'center' || !col.align) && 'text-center',
                  col.className,
                )}
              >
                {col.label}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  )
}
