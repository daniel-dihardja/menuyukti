'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { MenuItemsDisplayRow } from '@/lib/analytics/menu-items-page-adapter'
import { MenuItemsBubbleChart } from './menu-items-bubble-chart'

type SortKey = 'menuItem' | 'category' | 'subCategory' | 'quantity' | 'totalRevenue'

type Props = {
  rows: MenuItemsDisplayRow[]
  locale: string
  currency: string
}

export function MenuItemsTable({ rows, locale, currency }: Props) {
  const t = useTranslations('analytics.menuItems')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<SortKey>('quantity', 'desc')
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category',
    parseAsString.withDefault('all'),
  )

  const categoryOptions = useMemo(() => {
    const isMenuItemsCategory = (value: string) => value.trim().toLowerCase() === 'menu items'

    return [...new Set(rows.map((row) => row.category))].sort((a, b) => {
      if (isMenuItemsCategory(a)) return -1
      if (isMenuItemsCategory(b)) return 1
      return a.localeCompare(b, locale)
    })
  }, [rows, locale])

  const selectedCategory = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all'

  const filteredRows = useMemo(() => {
    if (selectedCategory === 'all') {
      return rows
    }

    return rows.filter((row) => row.category === selectedCategory)
  }, [rows, selectedCategory])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, locale)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      const diff = (aVal as number) - (bVal as number)
      return sortDirection === 'asc' ? diff : -diff
    })
  }, [filteredRows, sortKey, sortDirection, locale])

  return (
    <div className="flex flex-col gap-4">
      <Field className="max-w-sm gap-2">
        <FieldLabel htmlFor="menu-items-category-filter">{t('filters.categoryLabel')}</FieldLabel>
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            void setCategoryFilter(value)
          }}
        >
          <SelectTrigger
            id="menu-items-category-filter"
            aria-label={t('filters.categoryAriaLabel')}
            className="w-full"
          >
            <SelectValue placeholder={t('filters.categoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Tabs defaultValue="table" className="w-full">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="table">{t('tabs.table')}</TabsTrigger>
          <TabsTrigger value="bubbleChart">{t('tabs.bubbleChart')}</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
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
                    {rows.length === 0 ? t('table.empty') : t('emptyFiltered')}
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
        </TabsContent>

        <TabsContent value="bubbleChart" className="mt-4">
          <MenuItemsBubbleChart rows={filteredRows} locale={locale} currency={currency} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
