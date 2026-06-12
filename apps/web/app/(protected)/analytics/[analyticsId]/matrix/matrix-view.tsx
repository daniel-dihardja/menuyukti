'use client'

import { useCallback, useMemo, useState, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { cn } from '@workspace/ui/lib/utils'

import {
  CATEGORY_ORDER,
  distributionFromGroupedRows,
  distributionToCategoryMap,
  matrixItemsToGroupedRows,
  type MatrixCategory,
} from '@/lib/analytics/matrix-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries'

import { MatrixCategoryTables } from './matrix-category-tables'
import { MatrixDistributionGrid } from './matrix-distribution-grid'
import { MatrixPortfolioKpis } from './matrix-portfolio-kpis'
import { MatrixQuadrantLegend } from './matrix-quadrant-legend'
import type { MatrixScatterItem } from './matrix-scatter-chart'

const MatrixScatterChart = dynamic(
  async () =>
    (await import('@/app/(protected)/analytics/[analyticsId]/matrix/matrix-scatter-chart'))
      .MatrixScatterChart as ComponentType<{
      items: MatrixScatterItem[]
      thresholds: { avgPopularity: number; avgContributionMargin: number }
      locale: string
      currency: string
    }>,
  { ssr: false },
)

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]
type DistributionItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['distribution'][number]
type Thresholds = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['thresholds']

type Props = {
  items: MatrixItem[]
  distribution: DistributionItem[]
  thresholds: Thresholds
  locale: string
  currency: string
}

function allMatrixCategoriesSelected(selected: Set<MatrixCategory>): boolean {
  return CATEGORY_ORDER.every((category) => selected.has(category))
}

export function MatrixView({ items, distribution, thresholds, locale, currency }: Props) {
  const t = useTranslations('analytics.matrix')
  const tCategories = useTranslations('analytics.matrix.categories')
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category',
    parseAsString.withDefault('all'),
  )
  const [selectedMatrixCategories, setSelectedMatrixCategories] = useState<Set<MatrixCategory>>(
    () => new Set(CATEGORY_ORDER),
  )

  const menuCategoryLabel = useCallback(
    (menuCategory: string | null | undefined) => menuCategory?.trim() || t('uncategorized'),
    [t],
  )

  const categoryOptions = useMemo(() => {
    const isMenuItemsCategory = (value: string) => value.trim().toLowerCase() === 'menu items'

    return [...new Set(items.map((row) => menuCategoryLabel(row.menuCategory)))].sort((a, b) => {
      if (isMenuItemsCategory(a)) return -1
      if (isMenuItemsCategory(b)) return 1
      return a.localeCompare(b, locale)
    })
  }, [items, locale, menuCategoryLabel])

  const selectedCategory = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all'
  const isCategoryFiltered = selectedCategory !== 'all'

  const categoryFilteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return items
    }
    return items.filter((item) => menuCategoryLabel(item.menuCategory) === selectedCategory)
  }, [items, menuCategoryLabel, selectedCategory])

  const quadrantFilteredItems = useMemo(() => {
    if (allMatrixCategoriesSelected(selectedMatrixCategories)) {
      return categoryFilteredItems
    }
    return categoryFilteredItems.filter((item) =>
      selectedMatrixCategories.has(item.category as MatrixCategory),
    )
  }, [categoryFilteredItems, selectedMatrixCategories])

  const grouped = useMemo(
    () => matrixItemsToGroupedRows(quadrantFilteredItems),
    [quadrantFilteredItems],
  )

  const serverPortfolioStats = useMemo(
    () => distributionToCategoryMap(distribution),
    [distribution],
  )
  const filteredPortfolioStats = useMemo(() => distributionFromGroupedRows(grouped), [grouped])
  const portfolioStats = isCategoryFiltered ? filteredPortfolioStats : serverPortfolioStats

  const scatterItems = useMemo<MatrixScatterItem[]>(
    () =>
      quadrantFilteredItems.map((item) => ({
        menu: item.menu,
        quantity: item.quantity,
        contributionMargin: item.contributionMargin,
        category: item.category,
        action: item.action,
      })),
    [quadrantFilteredItems],
  )

  const totalVisible =
    grouped.star.length + grouped.plow_horse.length + grouped.puzzle.length + grouped.low_end.length

  const toggleMatrixCategory = useCallback((category: MatrixCategory) => {
    setSelectedMatrixCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const toggleMatrixCategoryCheckbox = useCallback((category: MatrixCategory, checked: boolean) => {
    setSelectedMatrixCategories((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(category)
      } else {
        next.delete(category)
      }
      return next
    })
  }, [])

  const quadrantFilterEmpty = selectedMatrixCategories.size === 0

  return (
    <div className="flex flex-col gap-6">
      <MatrixPortfolioKpis
        thresholds={thresholds}
        itemCount={items.length}
        locale={locale}
        currency={currency}
      />

      <MatrixDistributionGrid
        portfolioStats={portfolioStats}
        selectedCategories={selectedMatrixCategories}
        onToggleCategory={toggleMatrixCategory}
      />

      <div className="flex flex-wrap items-end gap-4">
        <Field className="max-w-sm flex-1 gap-2">
          <FieldLabel htmlFor="matrix-menu-category-filter">
            {t('filters.categoryLabel')}
          </FieldLabel>
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

        <Badge variant="secondary" className="mb-0.5 font-normal">
          {t('filters.showingCount', { count: totalVisible })}
        </Badge>
      </div>

      <Field className="gap-2">
        <FieldSet
          className="flex flex-col gap-3 rounded-lg border bg-muted/15 p-3"
          aria-label={t('filters.matrixAriaLabel')}
        >
          <FieldLegend className="text-sm font-medium">{t('filters.matrixLabel')}</FieldLegend>
          <FieldDescription>{t('filters.matrixHelp')}</FieldDescription>
          <div className="flex flex-wrap gap-3">
            {CATEGORY_ORDER.map((category) => {
              const checkboxId = `matrix-quadrant-${category}`
              return (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedMatrixCategories.has(category)}
                    id={checkboxId}
                    onCheckedChange={(checked) => {
                      toggleMatrixCategoryCheckbox(category, checked === true)
                    }}
                  />
                  <Label htmlFor={checkboxId} className="flex cursor-pointer items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('font-normal', MATRIX_CATEGORY_BADGE_CLASS[category])}
                    >
                      {tCategories(category)}
                    </Badge>
                  </Label>
                </div>
              )
            })}
          </div>
        </FieldSet>
      </Field>

      {isCategoryFiltered ? (
        <Alert>
          <AlertDescription>{t('filteredStatsAlert')}</AlertDescription>
        </Alert>
      ) : null}

      {quadrantFilterEmpty ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {t('quadrantFilterEmpty')}
        </div>
      ) : totalVisible === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {t('emptyFiltered')}
        </div>
      ) : (
        <Tabs defaultValue="matrix">
          <TabsList>
            <TabsTrigger value="matrix">{t('tabs.matrix')}</TabsTrigger>
            <TabsTrigger value="items">{t('tabs.items')}</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="flex flex-col gap-4">
            <MatrixScatterChart
              items={scatterItems}
              thresholds={{
                avgPopularity: thresholds.avgPopularity,
                avgContributionMargin: thresholds.avgContributionMargin,
              }}
              locale={locale}
              currency={currency}
            />
            <MatrixQuadrantLegend />
          </TabsContent>

          <TabsContent value="items">
            <MatrixCategoryTables
              grouped={grouped}
              portfolioStats={portfolioStats}
              locale={locale}
              currency={currency}
              hideEmptyQuadrants
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
