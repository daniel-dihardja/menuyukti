'use client'

import { ArrowDown, ArrowUp, ChevronDown, HelpCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { SortableTable, useSortableColumns } from '@/components/sortable-table'
import { MilestonePreviewHelpTrigger } from '@/app/(protected)/workflow/_components/milestone-preview/milestone-preview-help-trigger'
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
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
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
type MobileSortKey = PairSortKey

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

function PairCell({ pair, breakWords = false }: { pair: MenuComboPair; breakWords?: boolean }) {
  const nameClass = breakWords ? 'break-words font-medium' : 'truncate font-medium'
  const subClass = breakWords
    ? 'text-xs text-muted-foreground break-words'
    : 'truncate text-xs text-muted-foreground'

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={nameClass}>{pair.menuA}</span>
        {pair.menuACategory ? <span className={subClass}>{pair.menuACategory}</span> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={
            breakWords ? 'break-words text-muted-foreground' : 'truncate text-muted-foreground'
          }
        >
          + {pair.menuB}
        </span>
        {pair.menuBCategory ? <span className={subClass}>{pair.menuBCategory}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        <MatrixCategoryBadge category={pair.matrixCategoryA} />
        <MatrixCategoryBadge category={pair.matrixCategoryB} />
      </div>
    </div>
  )
}

function MobilePairCard({ pair, locale }: { pair: MenuComboPair; locale: string }) {
  const t = useTranslations('analytics.menuCombos.table')
  const tMobile = useTranslations('analytics.menuCombos.mobile')
  const [confidenceOpen, setConfidenceOpen] = useState(false)

  const rowClass = liftStrengthClass(pair.lift)
  const isStrong = pair.lift >= STRONG_LIFT_THRESHOLD

  const bestConfidence =
    pair.confidenceAToB >= pair.confidenceBToA
      ? { menu: pair.menuA, other: pair.menuB, percent: pair.confidenceAToB }
      : { menu: pair.menuB, other: pair.menuA, percent: pair.confidenceBToA }

  return (
    <li
      className={cn('flex flex-col gap-3 rounded-lg border border-card-border px-4 py-3', rowClass)}
    >
      <PairCell pair={pair} breakWords />

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            {t('lift')}
            <MilestonePreviewHelpTrigger helpText={t('liftTooltip')} ariaLabel={t('liftTooltip')} />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold tabular-nums">
              {formatLift(pair.lift, locale)}
            </span>
            {isStrong ? (
              <Badge variant="secondary" className="w-fit font-normal text-xs">
                {t('strongLiftBadge')}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('coOrders')}</span>
          <span className="text-lg font-semibold tabular-nums">{pair.coOrderCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            {t('support')}
            <MilestonePreviewHelpTrigger
              helpText={t('supportTooltip')}
              ariaLabel={t('supportTooltip')}
            />
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatPercent(pair.support, locale)}
          </span>
        </div>
      </div>

      <Collapsible open={confidenceOpen} onOpenChange={setConfidenceOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto w-full justify-between px-0 py-1">
            <span className="text-xs text-muted-foreground">
              {confidenceOpen ? tMobile('hideConfidence') : tMobile('showConfidence')}
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                confidenceOpen && 'rotate-180',
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-2 pt-1">
          <p className="text-sm text-muted-foreground">
            {tMobile('confidenceSummary', {
              menu: bestConfidence.menu,
              other: bestConfidence.other,
              percent: formatPercent(bestConfidence.percent, locale),
            })}
          </p>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
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
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

export function MenuCombosPairsTable({ pairs, locale }: MenuCombosPairsTableProps) {
  const t = useTranslations('analytics.menuCombos.table')
  const tMobile = useTranslations('analytics.menuCombos.mobile')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<TableSortKey>('lift', 'desc')

  const sortedPairs = useMemo(() => {
    if (sortKey === 'pair' || sortKey === 'confidence') {
      return sortPairs(pairs, 'lift', sortDirection)
    }
    return sortPairs(pairs, sortKey, sortDirection)
  }, [pairs, sortKey, sortDirection])

  const mobileSortKey: MobileSortKey =
    sortKey === 'coOrderCount' || sortKey === 'support' ? sortKey : 'lift'

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

        <CardContent className="flex flex-col gap-4 px-4 pt-4 pb-4 md:hidden">
          <div className="flex items-end gap-2">
            <Field className="min-w-0 flex-1 gap-2">
              <FieldLabel htmlFor="menu-combos-mobile-sort">{tMobile('sortLabel')}</FieldLabel>
              <Select
                value={mobileSortKey}
                onValueChange={(value) => {
                  if (value === 'lift' || value === 'coOrderCount' || value === 'support') {
                    toggleSort(value)
                  }
                }}
              >
                <SelectTrigger id="menu-combos-mobile-sort" aria-label={tMobile('sortAriaLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lift">{tMobile('sortLift')}</SelectItem>
                  <SelectItem value="coOrderCount">{tMobile('sortCoOrders')}</SelectItem>
                  <SelectItem value="support">{tMobile('sortSupport')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={
                sortDirection === 'asc' ? tMobile('sortAscending') : tMobile('sortDescending')
              }
              onClick={() => toggleSort(mobileSortKey)}
            >
              {sortDirection === 'asc' ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
            </Button>
          </div>

          <ul className="flex flex-col gap-3">
            {sortedPairs.map((pair) => (
              <MobilePairCard key={`${pair.menuA}::${pair.menuB}`} pair={pair} locale={locale} />
            ))}
          </ul>
        </CardContent>

        <CardContent className="hidden overflow-x-auto px-0 pt-0 pb-4 md:block">
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
