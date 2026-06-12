'use client'

import { Lightbulb, Megaphone, Radio } from 'lucide-react'
import Link from 'next/link'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
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
import { CATEGORY_ORDER, type MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import { routes } from '@/lib/routes'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { HeatmapMatrix } from '../heatmap/heatmap-matrix'
import { MenuCombosBundleIdeas } from './_components/menu-combos-bundle-ideas'
import { MenuCombosFilters } from './_components/menu-combos-filters'
import { MenuCombosKpis } from './_components/menu-combos-kpis'
import { MenuCombosPairsTable } from './_components/menu-combos-pairs-table'

type MenuCombosViewProps = {
  analyticsId: number
  menuCombos: MenuCombosPayload
  locale: string
  matrixAvailable: boolean
}

function allQuadrantsSelected(selected: Set<MatrixCategory>): boolean {
  return CATEGORY_ORDER.every((category) => selected.has(category))
}

function parseQuadrantParam(value: string | null): Set<MatrixCategory> {
  if (!value) return new Set(CATEGORY_ORDER)
  const parts = value.split(',').filter(Boolean)
  const valid = parts.filter((p): p is MatrixCategory =>
    (CATEGORY_ORDER as readonly string[]).includes(p),
  )
  return valid.length > 0 ? new Set(valid) : new Set(CATEGORY_ORDER)
}

function serializeQuadrants(quadrants: Set<MatrixCategory>): string | null {
  if (allQuadrantsSelected(quadrants)) return null
  return [...quadrants].join(',')
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
  const [quadrantParam, setQuadrantParam] = useQueryState('quadrant', parseAsString)

  const selectedQuadrants = useMemo(() => parseQuadrantParam(quadrantParam), [quadrantParam])

  const onQuadrantToggle = useCallback(
    (category: MatrixCategory, checked: boolean) => {
      const next = new Set(selectedQuadrants)
      if (checked) {
        next.add(category)
      } else {
        next.delete(category)
      }
      void setQuadrantParam(serializeQuadrants(next))
    },
    [selectedQuadrants, setQuadrantParam],
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
        quadrants: selectedQuadrants,
        menuCategory: selectedCategory,
        minLift,
      }),
    [menuCombos.pairs, selectedCategory, selectedQuadrants, minLift],
  )

  const bundleIdeas = useMemo(() => groupBundleIdeas(menuCombos.pairs), [menuCombos.pairs])
  const topPair = useMemo(() => getTopComboPair(menuCombos.pairs), [menuCombos.pairs])

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
      explainTitle: t('matrix.explainTitle'),
      explainBody: t('matrix.explainBody'),
      cellAriaLabel: (menu: string, other: string, lift: number) =>
        t('matrix.cellAriaLabel', { menu, other, lift: formatLift(lift, locale) }),
      cellTooltip: (menu: string, other: string, lift: number) =>
        t('matrix.cellTooltip', { menu, other, lift: formatLift(lift, locale) }),
    }),
    [locale, t],
  )

  const workflowHref = `${routes.workflows.list}?fromAnalytics=${String(analyticsId)}&focus=combos`

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
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.matrix(analyticsId)}>{t('linkToMatrix')}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.campaignSignals(analyticsId)}>
            <Radio aria-hidden data-icon="inline-start" />
            {t('linkToCampaignSignals')}
          </Link>
        </Button>
        {!matrixAvailable ? (
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.cogs(analyticsId)}>{t('linkToCogs')}</Link>
          </Button>
        ) : null}
      </div>

      {!matrixAvailable ? (
        <Alert>
          <AlertDescription>{t('matrixUnavailable')}</AlertDescription>
        </Alert>
      ) : null}

      <MenuCombosKpis menuCombos={menuCombos} locale={locale} />

      {topPair ? (
        <Alert>
          <Lightbulb aria-hidden />
          <AlertTitle>{t('insightTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>
              {t('insightTopPair', {
                menuA: topPair.menuA,
                menuB: topPair.menuB,
                lift: formatLift(topPair.lift, locale),
              })}
            </p>
            <Button asChild variant="secondary" size="sm" className="w-fit">
              <Link href={workflowHref}>
                <Megaphone aria-hidden data-icon="inline-start" />
                {t('createCampaignCta')}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <MenuCombosBundleIdeas groups={bundleIdeas} locale={locale} />

      <MenuCombosFilters
        categoryOptions={categoryOptions}
        selectedCategory={selectedCategory}
        onCategoryChange={(value) => {
          void setCategoryFilter(value)
        }}
        selectedQuadrants={selectedQuadrants}
        onQuadrantToggle={onQuadrantToggle}
        minLift={minLift}
        onMinLiftChange={(value) => {
          void setMinLiftFilter(value)
        }}
        visibleCount={filteredPairs.length}
      />

      <Tabs
        value={view === 'matrix' ? 'matrix' : 'pairs'}
        onValueChange={(value) => {
          void setView(value)
        }}
      >
        <TabsList>
          <TabsTrigger value="pairs">{t('tabs.pairs')}</TabsTrigger>
          <TabsTrigger value="matrix">{t('tabs.matrix')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pairs" className="mt-4">
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
          <Alert>
            <AlertTitle>{t('matrix.explainTitle')}</AlertTitle>
            <AlertDescription>{t('matrix.explainBody')}</AlertDescription>
          </Alert>
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
      </Tabs>
    </div>
  )
}
