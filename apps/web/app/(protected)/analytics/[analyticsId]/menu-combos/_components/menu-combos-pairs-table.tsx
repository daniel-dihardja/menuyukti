'use client'

import { HelpCircle } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import type { MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import {
  formatLift,
  formatPercent,
  liftStrengthClass,
  sortPairs,
  STRONG_LIFT_THRESHOLD,
  type PairSortKey,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPair } from '@/lib/graphql/queries/analytics'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

type MenuCombosPairsTableProps = {
  pairs: MenuComboPair[]
  locale: string
}

type TableSortKey = PairSortKey | 'pair' | 'confidence'

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

function ColumnHeaderWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex rounded-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={tooltip}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <HelpCircle aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </span>
  )
}

function PairCell({ pair }: { pair: MenuComboPair }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium">{pair.menuA}</span>
        {pair.menuACategory ? (
          <span className="truncate text-xs text-muted-foreground">{pair.menuACategory}</span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-muted-foreground">+ {pair.menuB}</span>
        {pair.menuBCategory ? (
          <span className="truncate text-xs text-muted-foreground">{pair.menuBCategory}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        <MatrixCategoryBadge category={pair.matrixCategoryA} />
        <MatrixCategoryBadge category={pair.matrixCategoryB} />
      </div>
    </div>
  )
}

export function MenuCombosPairsTable({ pairs, locale }: MenuCombosPairsTableProps) {
  const t = useTranslations('analytics.menuCombos.table')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<TableSortKey>('lift', 'desc')

  const sortedPairs = useMemo(() => {
    if (sortKey === 'pair' || sortKey === 'confidence') {
      return sortPairs(pairs, 'lift', sortDirection)
    }
    return sortPairs(pairs, sortKey, sortDirection)
  }, [pairs, sortKey, sortDirection])

  const columns = useMemo(
    () => [
      {
        id: 'pair' as const,
        label: t('pair'),
        align: 'left' as const,
        sortable: false,
        className: 'min-w-[12rem]',
      },
      {
        id: 'coOrderCount' as const,
        label: t('coOrders'),
        align: 'right' as const,
      },
      {
        id: 'lift' as const,
        label: <ColumnHeaderWithTooltip label={t('lift')} tooltip={t('liftTooltip')} />,
        align: 'right' as const,
      },
      {
        id: 'support' as const,
        label: <ColumnHeaderWithTooltip label={t('support')} tooltip={t('supportTooltip')} />,
        align: 'right' as const,
      },
      {
        id: 'confidence' as const,
        label: <ColumnHeaderWithTooltip label={t('confidence')} tooltip={t('confidenceTooltip')} />,
        align: 'right' as const,
        sortable: false,
        className: 'min-w-[14rem]',
      },
    ],
    [t],
  )

  if (pairs.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b border-card-border py-5 sm:py-6">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pt-0">
          <SortableTable
            columns={columns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
            caption={t('title')}
          >
            {sortedPairs.map((pair) => {
              const rowClass = liftStrengthClass(pair.lift)
              const isStrong = pair.lift >= STRONG_LIFT_THRESHOLD
              return (
                <TableRow key={`${pair.menuA}::${pair.menuB}`} className={rowClass ?? undefined}>
                  <TableCell className="min-w-0 max-w-xs">
                    <PairCell pair={pair} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pair.coOrderCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-medium">{formatLift(pair.lift, locale)}</span>
                      {isStrong ? (
                        <Badge variant="secondary" className="font-normal text-xs">
                          {t('strongLiftBadge')}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(pair.support, locale)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span>
                        {t('confidenceLineA', {
                          menu: pair.menuA,
                          percent: formatPercent(pair.confidenceAToB, locale),
                          other: pair.menuB,
                        })}
                      </span>
                      <span>
                        {t('confidenceLineB', {
                          menu: pair.menuB,
                          percent: formatPercent(pair.confidenceBToA, locale),
                          other: pair.menuA,
                        })}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </SortableTable>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
