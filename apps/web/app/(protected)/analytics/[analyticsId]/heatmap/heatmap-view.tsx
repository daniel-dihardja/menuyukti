'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
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
import { DAILY_HEATMAP_END_HOUR, DAILY_HEATMAP_START_HOUR } from '@/lib/heatmap-config'
import {
  buildMenuEngineeringCategoryByMenu,
  CATEGORY_ORDER,
  type MatrixCategory,
} from '@/lib/analytics/matrix-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import {
  computeColumnTotals,
  findPeakColumnIndex,
  findTopRowByTotal,
} from '@/lib/analytics/heatmap-insights'
import type { MenuEngineeringMatrixData, MenuHeatmapsData } from '@/lib/graphql/queries/analytics'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'
import { HeatmapMatrix } from './heatmap-matrix'
import { adaptDailyHeatmapMatrix, adaptWeeklyHeatmapMatrix } from './heatmap.adapters'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]

type HeatmapViewProps = {
  analyticsId: number
  menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
  matrixItems: MatrixItem[] | null
  locale: string
}

function allMatrixCategoriesSelected(selected: Set<MatrixCategory>): boolean {
  return CATEGORY_ORDER.every((category) => selected.has(category))
}

type InsightStripProps = {
  peakLabel: string
  topItemLabel: string
  itemCountLabel: string
}

function InsightStrip({ peakLabel, topItemLabel, itemCountLabel }: InsightStripProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Badge variant="secondary" className="font-normal">
        {peakLabel}
      </Badge>
      <Badge variant="secondary" className="max-w-full truncate font-normal">
        {topItemLabel}
      </Badge>
      <Badge variant="outline" className="font-normal">
        {itemCountLabel}
      </Badge>
    </div>
  )
}

export function HeatmapView({ analyticsId, menuHeatmaps, matrixItems, locale }: HeatmapViewProps) {
  const t = useTranslations('analytics.heatmap')
  const tMatrixCategories = useTranslations('analytics.matrix.categories')
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
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

  const hasMatrixFilter = matrixItems != null && matrixItems.length > 0

  const menuEngineeringCategoryByMenu = useMemo(
    () => buildMenuEngineeringCategoryByMenu(matrixItems),
    [matrixItems],
  )

  const categoryOptions = useMemo(() => {
    const isMenuItemsCategory = (value: string) => value.trim().toLowerCase() === 'menu items'

    return [...new Set(menuHeatmaps.map((row) => menuCategoryLabel(row.menuCategory)))].sort(
      (a, b) => {
        if (isMenuItemsCategory(a)) return -1
        if (isMenuItemsCategory(b)) return 1
        return a.localeCompare(b, locale)
      },
    )
  }, [menuHeatmaps, locale, menuCategoryLabel])

  const selectedCategory = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all'

  const posFilteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return menuHeatmaps
    }
    return menuHeatmaps.filter((item) => menuCategoryLabel(item.menuCategory) === selectedCategory)
  }, [menuHeatmaps, selectedCategory, menuCategoryLabel])

  const matrixFilterActive =
    hasMatrixFilter && !allMatrixCategoriesSelected(selectedMatrixCategories)

  const filteredItems = useMemo(() => {
    if (!hasMatrixFilter) {
      return posFilteredItems
    }

    if (selectedMatrixCategories.size === 0) {
      return []
    }

    if (!matrixFilterActive) {
      return posFilteredItems
    }

    return posFilteredItems.filter((item) => {
      const menu = item.menu?.trim()
      if (!menu) return false
      const category = menuEngineeringCategoryByMenu.get(menu)
      return category != null && selectedMatrixCategories.has(category)
    })
  }, [
    hasMatrixFilter,
    matrixFilterActive,
    menuEngineeringCategoryByMenu,
    posFilteredItems,
    selectedMatrixCategories,
  ])

  const toggleMatrixCategory = useCallback((category: MatrixCategory, checked: boolean) => {
    setSelectedMatrixCategories((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(category)
      } else {
        next.delete(category)
      }
      return next
    })
  }, [])

  const dailyMatrix = useMemo(
    () => adaptDailyHeatmapMatrix(filteredItems, DAILY_HEATMAP_START_HOUR, DAILY_HEATMAP_END_HOUR),
    [filteredItems],
  )
  const weeklyMatrix = useMemo(() => adaptWeeklyHeatmapMatrix(filteredItems), [filteredItems])

  const matrixLabels = useMemo(
    () => ({
      menuColumnLabel: t('matrix.menuColumn'),
      legendLow: t('legend.low'),
      legendHigh: t('legend.high'),
      unitsLabel: t('legend.units'),
      totalsRowLabel: t('totals.label'),
      sortHint: t('sort.hint'),
      explainTitle: t('explain.title'),
      explainBody: t('explain.body'),
      cellAriaLabel: (menu: string, window: string, count: number) =>
        t('cellAriaLabel', { menu, window, count }),
      cellTooltip: (menu: string, window: string, count: number) =>
        t('tooltip', { menu, window, count }),
    }),
    [t],
  )

  const reportingPeriod = useMemo(() => {
    const period = menuHeatmaps.find((row) => row.reportingPeriod?.trim())?.reportingPeriod?.trim()
    return period ?? null
  }, [menuHeatmaps])

  const dailyPeakColumnIndex = useMemo(() => {
    const totals = computeColumnTotals(dailyMatrix.rows)
    return findPeakColumnIndex(totals) ?? 0
  }, [dailyMatrix.rows])

  const weeklyPeakColumnIndex = useMemo(() => {
    const totals = computeColumnTotals(weeklyMatrix.rows)
    return findPeakColumnIndex(totals) ?? 0
  }, [weeklyMatrix.rows])

  const dailyTopRow = useMemo(() => findTopRowByTotal(dailyMatrix.rows), [dailyMatrix.rows])
  const weeklyTopRow = useMemo(() => findTopRowByTotal(weeklyMatrix.rows), [weeklyMatrix.rows])

  const dailyTopTotal = dailyTopRow ? dailyTopRow.values.reduce((sum, value) => sum + value, 0) : 0
  const weeklyTopTotal = weeklyTopRow
    ? weeklyTopRow.values.reduce((sum, value) => sum + value, 0)
    : 0

  const itemCount = filteredItems.length

  const hasData = menuHeatmaps.length > 0
  const dailyEmpty = dailyMatrix.rows.length === 0
  const weeklyEmpty = weeklyMatrix.rows.length === 0
  const filteredEmpty = hasData && dailyEmpty && weeklyEmpty
  const matrixFilterEmpty = hasMatrixFilter && selectedMatrixCategories.size === 0

  if (!hasData) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>
  }

  const dailyTitle = t('dailyTitle', {
    startHour: DAILY_HEATMAP_START_HOUR,
    endHour: DAILY_HEATMAP_END_HOUR,
  })
  const weeklyTitle = t('weeklyTitle')

  const dailyPeakWindow =
    dailyPeakColumnIndex != null ? (dailyMatrix.columnLabels[dailyPeakColumnIndex] ?? '') : ''
  const weeklyPeakWindow =
    weeklyPeakColumnIndex != null ? (weeklyMatrix.columnLabels[weeklyPeakColumnIndex] ?? '') : ''

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {reportingPeriod ? (
          <Badge variant="secondary">
            {t('insights.reportingPeriod', { period: reportingPeriod })}
          </Badge>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.matrix(analyticsId)}>{t('linkToMatrix')}</Link>
        </Button>
      </div>

      <Field className="max-w-sm gap-2">
        <FieldLabel htmlFor="heatmap-menu-category-filter">{t('filters.categoryLabel')}</FieldLabel>
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            void setCategoryFilter(value)
          }}
        >
          <SelectTrigger
            id="heatmap-menu-category-filter"
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

      {hasMatrixFilter ? (
        <Field className="gap-2">
          <FieldSet
            className="flex flex-col gap-3 rounded-lg border bg-muted/15 p-3"
            aria-label={t('filters.matrixAriaLabel')}
          >
            <FieldLegend className="text-sm font-medium">{t('filters.matrixLabel')}</FieldLegend>
            <FieldDescription>{t('filters.matrixHelp')}</FieldDescription>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_ORDER.map((category) => {
                const checkboxId = `heatmap-matrix-category-${category}`
                return (
                  <div key={category} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedMatrixCategories.has(category)}
                      id={checkboxId}
                      onCheckedChange={(checked) => {
                        toggleMatrixCategory(category, checked === true)
                      }}
                    />
                    <Label htmlFor={checkboxId} className="flex cursor-pointer items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('font-normal', MATRIX_CATEGORY_BADGE_CLASS[category])}
                      >
                        {tMatrixCategories(category)}
                      </Badge>
                    </Label>
                  </div>
                )
              })}
            </div>
          </FieldSet>
        </Field>
      ) : null}

      {matrixFilterEmpty || filteredEmpty ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {matrixFilterEmpty ? t('filters.emptyMatrixFiltered') : t('emptyFiltered')}
        </div>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'weekly')}>
          <TabsList>
            <TabsTrigger value="daily">{t('tabs.daily')}</TabsTrigger>
            <TabsTrigger value="weekly">{t('tabs.weekly')}</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4 flex flex-col gap-4">
            {dailyEmpty ? (
              <p className="text-sm text-muted-foreground">{t('emptyDaily')}</p>
            ) : (
              <>
                <InsightStrip
                  peakLabel={t('insights.peakHour', { window: dailyPeakWindow })}
                  topItemLabel={
                    dailyTopRow
                      ? t('insights.topItem', { item: dailyTopRow.label, count: dailyTopTotal })
                      : t('insights.itemCount', { count: 0 })
                  }
                  itemCountLabel={t('insights.itemCount', { count: itemCount })}
                />
                <HeatmapMatrix
                  title={dailyTitle}
                  rows={dailyMatrix.rows}
                  columnLabels={dailyMatrix.columnLabels}
                  density="comfortable"
                  sortable
                  defaultSortColumnIndex={dailyPeakColumnIndex}
                  labels={matrixLabels}
                />
              </>
            )}
          </TabsContent>
          <TabsContent value="weekly" className="mt-4 flex flex-col gap-4">
            {weeklyEmpty ? (
              <p className="text-sm text-muted-foreground">{t('emptyWeekly')}</p>
            ) : (
              <>
                <InsightStrip
                  peakLabel={t('insights.peakDay', { window: weeklyPeakWindow })}
                  topItemLabel={
                    weeklyTopRow
                      ? t('insights.topItem', { item: weeklyTopRow.label, count: weeklyTopTotal })
                      : t('insights.itemCount', { count: 0 })
                  }
                  itemCountLabel={t('insights.itemCount', { count: itemCount })}
                />
                <HeatmapMatrix
                  title={weeklyTitle}
                  rows={weeklyMatrix.rows}
                  columnLabels={weeklyMatrix.columnLabels}
                  density="comfortable"
                  sortable
                  defaultSortColumnIndex={weeklyPeakColumnIndex}
                  labels={matrixLabels}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
