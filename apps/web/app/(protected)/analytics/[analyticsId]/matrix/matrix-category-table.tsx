'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@workspace/ui/components/badge'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Slider } from '@workspace/ui/components/slider'
import { formatCurrencyWithCode } from '@/lib/currency'
import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'
import type {
  DistributionStats,
  MatrixCategory,
  MatrixDisplayRow,
} from '@/lib/analytics/matrix-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'

type SortKey = 'menuItem' | 'unitsSold' | 'contributionMargin' | 'contributionMarginShare'

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
  const tHighlight = useTranslations('analytics.matrix.lowEndHighlight')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<SortKey>('unitsSold', 'desc')

  const [sliderValue, setSliderValue] = useState(0)

  const highlightedRows = useMemo<Set<MatrixDisplayRow>>(() => {
    if (category !== 'low_end' || sliderValue <= 0) return new Set()
    const threshold = sliderValue / 100
    const sorted = [...items].sort((a, b) => {
      const diff = a.contributionMarginShare - b.contributionMarginShare
      return diff !== 0 ? diff : a.menuItem.localeCompare(b.menuItem, locale)
    })
    const highlighted = new Set<MatrixDisplayRow>()
    let sum = 0
    for (const row of sorted) {
      if (sum + row.contributionMarginShare <= threshold + 1e-9) {
        highlighted.add(row)
        sum += row.contributionMarginShare
      } else {
        break
      }
    }
    return highlighted
  }, [category, items, sliderValue, locale])

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
        <Badge variant="outline" className={MATRIX_CATEGORY_BADGE_CLASS[category]}>
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
            { id: 'contributionMargin', label: tTable('margin') },
            { id: 'contributionMarginShare', label: tTable('shareOfTotalMargin') },
          ]}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          caption={tTable('caption', { category: tCategories(category) })}
        >
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                {tPortfolio('noItems')}
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((item) => {
              const inThresholdBand = highlightedRows.has(item)
              const sharePct = (item.contributionMarginShare * 100).toFixed(1)
              return (
                <TableRow
                  key={`${category}-${item.menuItem}`}
                  className={cn(
                    'hover:bg-muted/20 odd:bg-background even:bg-muted/10',
                    inThresholdBand &&
                      'border-l-4 border-l-primary bg-primary/5 odd:bg-primary/5 even:bg-primary/5 hover:bg-primary/10',
                  )}
                >
                  <TableCell className="px-3 py-2 font-medium">
                    {inThresholdBand ? (
                      <span className="sr-only">{tHighlight('rowIncludedInBand')}</span>
                    ) : null}
                    {item.menuItem}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {item.unitsSold.toLocaleString(locale)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {formatCurrencyWithCode(item.contributionMargin, currency, locale)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'px-3 py-2 text-right',
                      inThresholdBand &&
                        'font-semibold underline decoration-2 decoration-primary underline-offset-2',
                    )}
                    {...(inThresholdBand
                      ? {
                          'aria-label': tHighlight('shareCellDescription', { percent: sharePct }),
                        }
                      : {})}
                  >
                    {sharePct}%
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </SortableTable>
      </div>

      {category === 'low_end' && items.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <Field className="gap-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="low-end-margin-slider" className="text-xs font-medium">
                {tHighlight('sliderLabel')}
              </FieldLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                {tHighlight('sliderValue', { value: sliderValue.toFixed(1) })}
              </span>
            </div>
            <Slider
              id="low-end-margin-slider"
              min={0}
              max={10}
              step={0.1}
              value={[sliderValue]}
              onValueChange={([v]) => setSliderValue(v ?? 0)}
              aria-label={tHighlight('sliderAriaLabel', { value: sliderValue.toFixed(1) })}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={sliderValue}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{tHighlight('sliderHelp')}</p>
          </Field>
        </div>
      )}
    </section>
  )
}
