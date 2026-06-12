'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import {
  buildLiftMatrixRows,
  formatLift,
  formatPercent,
  multiItemOrderShare,
  pairLabel,
  type MenuCombosPayload,
} from '@/lib/analytics/menu-combos-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'
import { HeatmapMatrix } from '../heatmap/heatmap-matrix'

type MenuCombosViewProps = {
  analyticsId: number
  menuCombos: MenuCombosPayload
  locale: string
  matrixAvailable: boolean
}

function scopeBadgeLabel(scope: string, t: ReturnType<typeof useTranslations>): string {
  return scope === 'stars' ? t('insights.scopeStars') : t('insights.scopeTopSellers')
}

function MatrixCategoryBadge({ category }: { category: string | null | undefined }) {
  const tCategories = useTranslations('analytics.matrix.categories')
  if (!category) return null
  const key = category as MatrixCategory
  const className = MATRIX_CATEGORY_BADGE_CLASS[key]
  if (!className) return <Badge variant="outline">{category}</Badge>
  return (
    <Badge variant="outline" className={cn('font-normal', className)}>
      {tCategories(key)}
    </Badge>
  )
}

export function MenuCombosView({
  analyticsId,
  menuCombos,
  locale,
  matrixAvailable,
}: MenuCombosViewProps) {
  const t = useTranslations('analytics.menuCombos')
  const [view, setView] = useState<'pairs' | 'matrix'>('pairs')

  const multiItemShare = multiItemOrderShare(menuCombos)
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
      <div className="flex flex-col gap-4">
        <InsightStrip
          menuCombos={menuCombos}
          multiItemShare={multiItemShare}
          locale={locale}
          t={t}
        />
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.matrix(analyticsId)}>{t('linkToMatrix')}</Link>
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

      <InsightStrip menuCombos={menuCombos} multiItemShare={multiItemShare} locale={locale} t={t} />

      <Tabs value={view} onValueChange={(value) => setView(value as 'pairs' | 'matrix')}>
        <TabsList>
          <TabsTrigger value="pairs">{t('tabs.pairs')}</TabsTrigger>
          <TabsTrigger value="matrix">{t('tabs.matrix')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pairs" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.pair')}</TableHead>
                  <TableHead className="text-right">{t('table.coOrders')}</TableHead>
                  <TableHead className="text-right">{t('table.lift')}</TableHead>
                  <TableHead className="text-right">{t('table.support')}</TableHead>
                  <TableHead className="text-right">{t('table.confidence')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuCombos.pairs.map((pair) => (
                  <TableRow key={`${pair.menuA}::${pair.menuB}`}>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium">{pairLabel(pair)}</span>
                        <div className="flex flex-wrap gap-1">
                          <MatrixCategoryBadge category={pair.matrixCategoryA} />
                          <MatrixCategoryBadge category={pair.matrixCategoryB} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pair.coOrderCount}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatLift(pair.lift, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(pair.support, locale)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {t('table.confidenceValue', {
                        aToB: formatPercent(pair.confidenceAToB, locale),
                        bToA: formatPercent(pair.confidenceBToA, locale),
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
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

type InsightStripProps = {
  menuCombos: MenuCombosPayload
  multiItemShare: number
  locale: string
  t: ReturnType<typeof useTranslations>
}

function InsightStrip({ menuCombos, multiItemShare, locale, t }: InsightStripProps) {
  const numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  return (
    <div className="flex flex-wrap gap-3">
      <Badge variant="secondary" className="font-normal">
        {t('insights.totalOrders', { count: menuCombos.totalOrders })}
      </Badge>
      <Badge variant="secondary" className="font-normal">
        {t('insights.multiItemShare', { percent: formatPercent(multiItemShare, locale) })}
      </Badge>
      <Badge variant="secondary" className="font-normal">
        {t('insights.avgItems', { count: numberFmt.format(menuCombos.avgDistinctItemsPerOrder) })}
      </Badge>
      <Badge variant="outline" className="font-normal">
        {scopeBadgeLabel(menuCombos.scope, t)}
      </Badge>
    </div>
  )
}
