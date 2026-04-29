'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { TableCell, TableRow } from '@workspace/ui/components/table'

import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { MenuItemsDisplayRow } from '@/lib/analytics/menu-items-page-adapter'

type SortKey = 'menuItem' | 'category' | 'subCategory' | 'quantity' | 'totalRevenue'

type Props = {
  rows: MenuItemsDisplayRow[]
  locale: string
  currency: string
}

export function MenuItemsTable({ rows, locale, currency }: Props) {
  const t = useTranslations('analytics.menuItems')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<SortKey>('quantity', 'desc')

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, locale)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      const diff = (aVal as number) - (bVal as number)
      return sortDirection === 'asc' ? diff : -diff
    })
  }, [rows, sortKey, sortDirection, locale])

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <SortableTable<SortKey>
        columns={[
          { id: 'menuItem', label: t('table.menuItem'), align: 'left' },
          { id: 'category', label: t('table.category'), align: 'left' },
          { id: 'subCategory', label: t('table.subCategory'), align: 'left' },
          { id: 'quantity', label: t('table.qty') },
          { id: 'totalRevenue', label: t('table.revenue') },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={toggleSort}
        caption={t('table.caption')}
      >
        {sortedRows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
              {t('table.empty')}
            </TableCell>
          </TableRow>
        ) : (
          sortedRows.map((item, index) => (
            <TableRow
              key={`${item.menuItem}-${item.subCategory}-${index}`}
              className="hover:bg-muted/20"
            >
              <TableCell className="px-3 py-2 font-medium">{item.menuItem}</TableCell>
              <TableCell className="px-3 py-2">{item.category}</TableCell>
              <TableCell className="px-3 py-2">{item.subCategory}</TableCell>
              <TableCell className="px-3 py-2 text-right">
                {item.quantity.toLocaleString(locale)}
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                {formatCurrencyWithCode(item.totalRevenue, currency, locale)}
              </TableCell>
            </TableRow>
          ))
        )}
      </SortableTable>
    </div>
  )
}
