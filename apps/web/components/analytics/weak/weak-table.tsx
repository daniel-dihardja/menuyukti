'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import type { WeakDisplayRow } from '@/lib/analytics/weak-page-adapter'
import { formatCurrencyWithCode } from '@/lib/currency'
import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { Badge } from '@workspace/ui/components/badge'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'

type SortKey =
  | 'menuItem'
  | 'avgQtyPerDay'
  | 'unitsSold'
  | 'contributionMargin'
  | 'contributionMarginShare'
  | 'action'

type Props = {
  rows: WeakDisplayRow[]
  highlightedMenuItems: Set<string>
  showAvgQtyPerDay: boolean
  locale: string
  currency: string
}

function actionBadgeVariant(
  action: WeakDisplayRow['action'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action) {
    case 'promote':
      return 'default'
    case 'reprice':
      return 'secondary'
    case 'remove':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function WeakTable({
  rows,
  highlightedMenuItems,
  showAvgQtyPerDay,
  locale,
  currency,
}: Props) {
  const t = useTranslations('analytics.weak.table')
  const tImpact = useTranslations('analytics.weak.impact')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<SortKey>(
    'contributionMarginShare',
    'asc',
  )

  const qtyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }),
    [locale],
  )

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === 'action') {
        const aAction = a.action ?? ''
        const bAction = b.action ?? ''
        const cmp = aAction.localeCompare(bAction, locale)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      if (sortKey === 'menuItem') {
        const cmp = a.menuItem.localeCompare(b.menuItem, locale)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      if (sortKey === 'avgQtyPerDay') {
        const aVal = a.avgQtyPerDay ?? Number.NEGATIVE_INFINITY
        const bVal = b.avgQtyPerDay ?? Number.NEGATIVE_INFINITY
        const diff = aVal - bVal
        return sortDirection === 'asc' ? diff : -diff
      }
      const aVal = a[sortKey] as number
      const bVal = b[sortKey] as number
      const diff = aVal - bVal
      return sortDirection === 'asc' ? diff : -diff
    })
  }, [rows, sortKey, sortDirection, locale])

  const columns = [
    { id: 'menuItem' as const, label: t('menu'), align: 'left' as const },
    ...(showAvgQtyPerDay ? [{ id: 'avgQtyPerDay' as const, label: t('avgQtyPerDay') }] : []),
    { id: 'unitsSold' as const, label: t('periodQty') },
    { id: 'contributionMargin' as const, label: t('margin') },
    { id: 'contributionMarginShare' as const, label: t('shareOfTotalMargin') },
    { id: 'action' as const, label: t('action') },
  ]

  const colSpan = columns.length

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <SortableTable<SortKey>
        columns={columns}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={toggleSort}
        caption={t('caption')}
      >
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
              {t('empty')}
            </TableCell>
          </TableRow>
        ) : (
          sortedRows.map((row) => {
            const inBand = highlightedMenuItems.has(row.menuItem)
            const sharePct = (row.contributionMarginShare * 100).toFixed(1)
            const actionKey = row.action

            return (
              <TableRow
                key={row.menuItem}
                className={cn(
                  'hover:bg-muted/20 odd:bg-background even:bg-muted/10',
                  inBand &&
                    'border-l-4 border-l-primary bg-primary/5 odd:bg-primary/5 even:bg-primary/5 hover:bg-primary/10',
                )}
              >
                <TableCell className="px-3 py-2 font-medium">
                  {inBand ? <span className="sr-only">{tImpact('rowIncludedInBand')}</span> : null}
                  {row.menuItem}
                </TableCell>
                {showAvgQtyPerDay ? (
                  <TableCell className="px-3 py-2 text-right tabular-nums">
                    {row.avgQtyPerDay != null
                      ? qtyFmt.format(row.avgQtyPerDay)
                      : t('avgQtyPerDayUnavailable')}
                  </TableCell>
                ) : null}
                <TableCell className="px-3 py-2 text-right tabular-nums">
                  {row.unitsSold.toLocaleString(locale)}
                </TableCell>
                <TableCell className="px-3 py-2 text-right tabular-nums">
                  {formatCurrencyWithCode(row.contributionMargin, currency, locale)}
                </TableCell>
                <TableCell
                  className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    inBand &&
                      'font-semibold underline decoration-2 decoration-primary underline-offset-2',
                  )}
                  {...(inBand
                    ? {
                        'aria-label': tImpact('shareCellDescription', { percent: sharePct }),
                      }
                    : {})}
                >
                  {sharePct}%
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  {actionKey ? (
                    <Badge variant={actionBadgeVariant(actionKey)}>
                      {t(`actions.${actionKey}`)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })
        )}
      </SortableTable>
    </div>
  )
}
