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

import {
  distributionToCategoryMap,
  matrixItemsToGroupedRows,
} from '@/lib/analytics/matrix-page-adapter'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries'

import { MatrixCategoryTables } from './matrix-category-tables'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]
type DistributionItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['distribution'][number]

type Props = {
  items: MatrixItem[]
  distribution: DistributionItem[]
  locale: string
  currency: string
}

function menuCategoryLabel(menuCategory: string | null | undefined): string {
  return menuCategory?.trim() || 'Uncategorized'
}

export function MatrixView({ items, distribution, locale, currency }: Props) {
  const t = useTranslations('analytics.matrix')
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category',
    parseAsString.withDefault('all'),
  )

  const categoryOptions = useMemo(() => {
    const isMenuItemsCategory = (value: string) => value.trim().toLowerCase() === 'menu items'

    return [...new Set(items.map((row) => menuCategoryLabel(row.menuCategory)))].sort((a, b) => {
      if (isMenuItemsCategory(a)) return -1
      if (isMenuItemsCategory(b)) return 1
      return a.localeCompare(b, locale)
    })
  }, [items, locale])

  const selectedCategory = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all'

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return items
    }
    return items.filter((item) => menuCategoryLabel(item.menuCategory) === selectedCategory)
  }, [items, selectedCategory])

  const grouped = useMemo(() => matrixItemsToGroupedRows(filteredItems), [filteredItems])
  const portfolioStats = useMemo(() => distributionToCategoryMap(distribution), [distribution])

  const totalFiltered =
    grouped.star.length + grouped.plow_horse.length + grouped.puzzle.length + grouped.low_end.length

  return (
    <div className="flex flex-col gap-4">
      <Field className="max-w-sm gap-2">
        <FieldLabel htmlFor="matrix-menu-category-filter">{t('filters.categoryLabel')}</FieldLabel>
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            void setCategoryFilter(value)
          }}
        >
          <SelectTrigger
            id="matrix-menu-category-filter"
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

      {totalFiltered === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {t('emptyFiltered')}
        </div>
      ) : (
        <MatrixCategoryTables
          grouped={grouped}
          portfolioStats={portfolioStats}
          locale={locale}
          currency={currency}
        />
      )}
    </div>
  )
}
