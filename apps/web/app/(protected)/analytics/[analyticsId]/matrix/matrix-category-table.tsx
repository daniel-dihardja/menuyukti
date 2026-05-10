'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@workspace/ui/components/badge'
import { formatCurrencyWithCode } from '@/lib/currency'
import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import type {
  DistributionStats,
  MatrixCategory,
  MatrixDisplayRow,
} from '@/lib/analytics/matrix-page-adapter'

type SortKey = 'menuItem' | 'unitsSold' | 'revenue' | 'marginPct'

const CATEGORY_BADGE_CLASS: Record<MatrixCategory, string> = {
  star: 'bg-emerald-600 text-white border-transparent',
  plow_horse: 'bg-amber-500 text-black border-transparent',
  puzzle: 'bg-sky-100 text-sky-800 border-sky-300',
  low_end: 'bg-rose-100 text-rose-700 border-rose-300',
}

type Props = {
  category: MatrixCategory
  items: MatrixDisplayRow[]
  portfolioStats: DistributionStats
  locale: string
  currency: string
}

export function MatrixCategoryTable({ category, items, portfolioStats, locale, currency }: Props) {
  const tTable = useTranslations('analytics.matrix.table')
  const tCategories = useTranslations('analytics.matrix.categories')
  const tPortfolio = useTranslations('analytics.matrix.portfolio')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<SortKey>('unitsSold', 'desc')

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, locale)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      const diff = (aVal as number) - (bVal as number)
      return sortDirection === 'asc' ? diff : -diff
    })
  }, [items, sortKey, sortDirection, locale])

  const hasPortfolioData = portfolioStats.itemCount > 0
  const isFiltered = hasPortfolioData && items.length !== portfolioStats.itemCount
  const itemSharePct = `${(portfolioStats.itemShare * 100).toFixed(1)}%`
  const marginSharePct = `${(portfolioStats.marginShare * 100).toFixed(1)}%`

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">{tCategories(category)}</h3>
        <Badge variant="outline" className={CATEGORY_BADGE_CLASS[category]}>
          {tCategories(category)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isFiltered
            ? tPortfolio('filteredShowing', {
                visible: items.length,
                total: portfolioStats.itemCount,
              })
            : tPortfolio('itemCount', { count: portfolioStats.itemCount })}
        </span>
        {hasPortfolioData && (
          <>
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-muted-foreground">
              {tPortfolio('itemShare', { value: itemSharePct })}
            </span>
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-muted-foreground">
              {tPortfolio('marginShare', { value: marginSharePct })}
            </span>
          </>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <SortableTable<SortKey>
          columns={[
            { id: 'menuItem', label: tTable('menu'), align: 'left' },
            { id: 'unitsSold', label: tTable('qty') },
            { id: 'revenue', label: tTable('revenue') },
            { id: 'marginPct', label: tTable('percentage') },
          ]}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          caption={`${tCategories(category)} menu items: Menu, Units sold, Revenue, Margin %.`}
        >
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                {tPortfolio('noItems')}
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((item) => (
              <TableRow
                key={`${category}-${item.menuItem}`}
                className="hover:bg-muted/20 odd:bg-background even:bg-muted/10"
              >
                <TableCell className="px-3 py-2 font-medium">{item.menuItem}</TableCell>
                <TableCell className="px-3 py-2 text-right">
                  {item.unitsSold.toLocaleString(locale)}
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  {formatCurrencyWithCode(item.revenue, currency, locale)}
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  {(item.marginPct * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))
          )}
        </SortableTable>
      </div>
    </section>
  )
}
