'use client'

import { ChevronDown } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import {
  buildLiftMatrixRows,
  filterPairs,
  formatLift,
  getMenuCategoryOptions,
  getTopComboPair,
  groupBundleIdeas,
  type MenuCombosPayload,
  type MinLiftFilter,
} from '@/lib/analytics/menu-combos-page-adapter'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { HeatmapMatrix } from '../heatmap/heatmap-matrix'
import { MenuCombosBundleIdeas } from './_components/menu-combos-bundle-ideas'
import { MenuCombosFilters } from './_components/menu-combos-filters'
import { MenuCombosInsightHero } from './_components/menu-combos-insight-hero'
import { MenuCombosKpis } from './_components/menu-combos-kpis'
import { MenuCombosPairsTable } from './_components/menu-combos-pairs-table'
import { MenuCombosRelatedReports } from './_components/menu-combos-related-reports'
import { MenuCombosTimingTab } from './_components/menu-combos-timing-tab'

type MenuCombosViewProps = {
  analyticsId: number
  menuCombos: MenuCombosPayload
  locale: string
  matrixAvailable: boolean
}

export function MenuCombosView({
  analyticsId,
  menuCombos,
  locale,
  matrixAvailable,
}: MenuCombosViewProps) {
  const t = useTranslations('analytics.menuCombos')

  const [view, setView] = useQueryState('view', parseAsString.withDefault('pairs'))
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category',
    parseAsString.withDefault('all'),
  )
  const [minLiftFilter, setMinLiftFilter] = useQueryState(
    'minLift',
    parseAsString.withDefault('all'),
  )
  const categoryOptions = useMemo(
    () => getMenuCategoryOptions(menuCombos.pairs, locale),
    [menuCombos.pairs, locale],
  )

  const selectedCategory = categoryOptions.includes(categoryFilter) ? categoryFilter : 'all'
  const minLift = (['all', 'above1', 'above1_5'] as const).includes(minLiftFilter as MinLiftFilter)
    ? (minLiftFilter as MinLiftFilter)
    : 'all'

  const filteredPairs = useMemo(
    () =>
      filterPairs(menuCombos.pairs, {
        menuCategory: selectedCategory,
        minLift,
      }),
    [menuCombos.pairs, selectedCategory, minLift],
  )

  const bundleIdeas = useMemo(() => groupBundleIdeas(menuCombos.pairs), [menuCombos.pairs])
  const topPair = useMemo(() => getTopComboPair(menuCombos.pairs), [menuCombos.pairs])

  const activeView = view === 'matrix' || view === 'timing' ? view : 'pairs'

  const matrixRows = useMemo(
    () => buildLiftMatrixRows(menuCombos.focusMenus, menuCombos.matrixLift),
    [menuCombos.focusMenus, menuCombos.matrixLift],
  )

  const matrixLabels = useMemo(
    () => ({
      menuColumnLabel: t('matrix.menuColumn'),
      legendLow: t('matrix.legendLow'),
      legendHigh: t('matrix.legendHigh'),
      unitsLabel: t('matrix.unitsLabel'),
      totalsRowLabel: t('matrix.totalsRowLabel'),
      sortHint: t('matrix.sortHint'),
      scrollHint: t('matrix.scrollHint'),
      explainTitle: t('matrix.explainTitle'),
      explainBody: t('matrix.explainBody'),
      cellAriaLabel: (menu: string, other: string, lift: number) =>
        t('matrix.cellAriaLabel', { menu, other, lift: formatLift(lift, locale) }),
      cellTooltip: (menu: string, other: string, lift: number) =>
        t('matrix.cellTooltip', { menu, other, lift: formatLift(lift, locale) }),
    }),
    [locale, t],
  )

  if (menuCombos.totalOrders === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.description')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (menuCombos.multiItemOrderCount === 0 || menuCombos.pairs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <MenuCombosKpis menuCombos={menuCombos} locale={locale} />
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('emptyMultiItem.title')}</EmptyTitle>
            <EmptyDescription>{t('emptyMultiItem.description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {topPair ? (
        <MenuCombosInsightHero
          topPair={topPair}
          locale={locale}
          matrixUnavailable={!matrixAvailable}
        />
      ) : !matrixAvailable ? (
        <Alert>
          <AlertDescription>{t('matrixUnavailable')}</AlertDescription>
        </Alert>
      ) : null}

      <MenuCombosKpis menuCombos={menuCombos} locale={locale} />

      <Tabs
        className="min-w-0"
        value={activeView}
        onValueChange={(value) => {
          void setView(value)
        }}
      >
        <TabsList
          variant="line"
          className="w-full min-w-0 max-w-full justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        >
          <TabsTrigger className="shrink-0" value="pairs">
            {t('tabs.pairs')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="matrix">
            {t('tabs.matrix')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="timing">
            {t('tabs.timing')}
          </TabsTrigger>
        </TabsList>
        <p className="text-xs text-muted-foreground sm:hidden">{t('tabs.scrollHint')}</p>

        <TabsContent value="pairs" className="mt-4 flex flex-col gap-4">
          <MenuCombosFilters
            categoryOptions={categoryOptions}
            selectedCategory={selectedCategory}
            onCategoryChange={(value) => {
              void setCategoryFilter(value)
            }}
            minLift={minLift}
            onMinLiftChange={(value) => {
              void setMinLiftFilter(value)
            }}
            visibleCount={filteredPairs.length}
            stickyOnMobile
          />

          {filteredPairs.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>{t('emptyFiltered.title')}</EmptyTitle>
                <EmptyDescription>{t('emptyFiltered.description')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <MenuCombosPairsTable pairs={filteredPairs} locale={locale} />
          )}
        </TabsContent>

        <TabsContent value="matrix" className="mt-4 flex flex-col gap-4">
          <Alert className="hidden lg:flex lg:flex-col">
            <AlertTitle>{t('matrix.explainTitle')}</AlertTitle>
            <AlertDescription>{t('matrix.explainBody')}</AlertDescription>
          </Alert>

          <Collapsible className="lg:hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="group w-full justify-between px-0">
                <span>{t('matrix.showExplanation')}</span>
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Alert>
                <AlertTitle>{t('matrix.explainTitle')}</AlertTitle>
                <AlertDescription>{t('matrix.explainBody')}</AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>

          {matrixRows.length < 2 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>{t('emptyMatrix.title')}</EmptyTitle>
                <EmptyDescription>{t('emptyMatrix.description')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <HeatmapMatrix
              title={t('matrix.title')}
              rows={matrixRows}
              columnLabels={menuCombos.focusMenus}
              maskDiagonal
              density="compact"
              labels={matrixLabels}
            />
          )}
        </TabsContent>

        <TabsContent value="timing" className="mt-4 focus-visible:outline-none">
          <MenuCombosTimingTab
            pairs={menuCombos.pairs}
            topPairTiming={menuCombos.topPairTiming}
            slotDemandProfile={menuCombos.slotDemandProfile}
            locale={locale}
          />
        </TabsContent>
      </Tabs>

      <MenuCombosBundleIdeas groups={bundleIdeas} locale={locale} />

      <MenuCombosRelatedReports analyticsId={analyticsId} matrixAvailable={matrixAvailable} />
    </div>
  )
}
