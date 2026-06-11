'use client'

import { useMemo, useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { DAILY_HEATMAP_END_HOUR, DAILY_HEATMAP_START_HOUR } from '@/lib/heatmap-config'
import type { MenuHeatmapsData } from '@/lib/graphql/queries/analytics'
import { HeatmapMatrix } from './heatmap-matrix'
import { adaptDailyHeatmapMatrix, adaptWeeklyHeatmapMatrix } from './heatmap.adapters'

type HeatmapViewProps = {
  menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
  locale: string
}

function menuCategoryLabel(menuCategory: string | null | undefined): string {
  return menuCategory?.trim() || 'Uncategorized'
}

export function HeatmapView({ menuHeatmaps, locale }: HeatmapViewProps) {
  const t = useTranslations('analytics.heatmap')
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category',
    parseAsString.withDefault('all'),
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
  }, [menuHeatmaps, locale])

  const selectedCategory = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all'

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return menuHeatmaps
    }
    return menuHeatmaps.filter((item) => menuCategoryLabel(item.menuCategory) === selectedCategory)
  }, [menuHeatmaps, selectedCategory])

  const dailyMatrix = useMemo(
    () => adaptDailyHeatmapMatrix(filteredItems, DAILY_HEATMAP_START_HOUR, DAILY_HEATMAP_END_HOUR),
    [filteredItems],
  )
  const weeklyMatrix = useMemo(() => adaptWeeklyHeatmapMatrix(filteredItems), [filteredItems])

  const hasData = menuHeatmaps.length > 0
  const dailyEmpty = dailyMatrix.rows.length === 0
  const weeklyEmpty = weeklyMatrix.rows.length === 0
  const filteredEmpty = hasData && dailyEmpty && weeklyEmpty

  if (!hasData) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>
  }

  const dailyTitle = t('dailyTitle', {
    startHour: DAILY_HEATMAP_START_HOUR,
    endHour: DAILY_HEATMAP_END_HOUR,
  })
  const weeklyTitle = t('weeklyTitle')

  return (
    <div className="space-y-4">
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

      {filteredEmpty ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {t('emptyFiltered')}
        </div>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'weekly')}>
          <TabsList>
            <TabsTrigger value="daily">{t('tabs.daily')}</TabsTrigger>
            <TabsTrigger value="weekly">{t('tabs.weekly')}</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            {dailyEmpty ? (
              <p className="text-sm text-muted-foreground">{t('emptyDaily')}</p>
            ) : (
              <HeatmapMatrix
                title={dailyTitle}
                rows={dailyMatrix.rows}
                columnLabels={dailyMatrix.columnLabels}
                color="green"
                density="comfortable"
                sortable={false}
              />
            )}
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            {weeklyEmpty ? (
              <p className="text-sm text-muted-foreground">{t('emptyWeekly')}</p>
            ) : (
              <HeatmapMatrix
                title={weeklyTitle}
                rows={weeklyMatrix.rows}
                columnLabels={weeklyMatrix.columnLabels}
                color="green"
                density="comfortable"
                sortable={false}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
