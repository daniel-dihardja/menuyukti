'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeftRight, Gauge, History, Package, Trash2 } from 'lucide-react'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import {
  SortableTable,
  useSortableColumns,
  type SortableTableColumn,
} from '@/components/sortable-table'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { InventoryRefillForecastItem } from '@/lib/graphql/queries/inventory-refill-forecast'
import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { routes } from '@/lib/routes'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'

import { formatPackLabel } from './format-pack'
import { StockBadge } from './stock-badge'
import {
  cardActivitySummary,
  compareInventarStockRows,
  formatAvgDailyOut,
  formatDaysUntilRefill,
  stockLineValue,
  type InventarStockSortKey,
} from './stock-utils'
import { UpdatedByCell } from './updated-by-cell'

type Props = {
  activeLocationId: number | null
  stockRows: InventoryStockRow[]
  refillByCatalogId: ReadonlyMap<number, InventoryRefillForecastItem>
  catalogCount: number
  currencyCode: string
  onUse: (row: InventoryStockRow) => void
  onHistory: (row: InventoryStockRow) => void
  onEditLimits: (row: InventoryStockRow) => void
  onTransfer?: (row: InventoryStockRow) => void
  onRemove: (row: InventoryStockRow) => void
  onBookDelivery: () => void
}

export function StockList({
  activeLocationId,
  stockRows,
  refillByCatalogId,
  catalogCount,
  currencyCode,
  onUse,
  onHistory,
  onEditLimits,
  onTransfer,
  onRemove,
  onBookDelivery,
}: Props) {
  const t = useTranslations('inventar')
  const locale = useLocale()
  const isDesktop = useDesktopLayout()
  const forecastEmpty = t('forecastEmpty')
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<InventarStockSortKey>(
    'storageZone',
    'asc',
  )

  const displayRows = [...stockRows].toSorted((a, b) =>
    compareInventarStockRows(a, b, sortKey, sortDirection, locale, refillByCatalogId),
  )

  function formatMoney(amount: number | null): string {
    if (amount == null) return t('priceEmpty')
    return formatCurrencyWithCode(amount, currencyCode, locale)
  }

  function forecastCells(row: InventoryStockRow) {
    const forecast = refillByCatalogId.get(row.catalogItemId)
    return {
      avgDailyOut: formatAvgDailyOut(forecast?.avgDailyOut, locale, forecastEmpty),
      daysUntilRefill: formatDaysUntilRefill(forecast?.daysUntilRefill, locale, forecastEmpty),
    }
  }

  if (activeLocationId == null) {
    return <p className="text-sm text-muted-foreground">{t('branchPlaceholder')}</p>
  }

  if (stockRows.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package aria-hidden />
          </EmptyMedia>
          <EmptyTitle>
            {catalogCount === 0 ? t('catalogEmptyOnStockTitle') : t('stockEmpty')}
          </EmptyTitle>
          <EmptyDescription>
            {catalogCount === 0 ? t('catalogEmptyOnStock') : t('stockEmptyHint')}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {catalogCount === 0 ? (
            <Button asChild className="min-h-11 touch-manipulation lg:min-h-9">
              <Link href={routes.inventarCatalog}>{t('addPantryItem')}</Link>
            </Button>
          ) : (
            <Button
              type="button"
              className="min-h-11 touch-manipulation lg:min-h-9"
              onClick={onBookDelivery}
            >
              {t('bookDelivery')}
            </Button>
          )}
        </EmptyContent>
      </Empty>
    )
  }

  function buildRowActionItems(row: InventoryStockRow): ResponsiveActionMenuItem[] {
    const items: ResponsiveActionMenuItem[] = [
      {
        id: 'history',
        label: t('history'),
        icon: History,
        onSelect: () => onHistory(row),
      },
      {
        id: 'limits',
        label: t('editLimits'),
        icon: Gauge,
        onSelect: () => onEditLimits(row),
      },
    ]
    if (onTransfer) {
      items.push({
        id: 'transfer',
        label: t('transfer'),
        icon: ArrowLeftRight,
        onSelect: () => onTransfer(row),
      })
    }
    items.push({
      id: 'remove',
      label: t('removeFromLocation'),
      icon: Trash2,
      destructive: true,
      separatorBefore: true,
      onSelect: () => onRemove(row),
    })
    return items
  }

  function renderRowActions(row: InventoryStockRow) {
    return (
      <ResponsiveActionMenu
        items={buildRowActionItems(row)}
        sheetTitle={row.catalogItem.name}
        desktopTriggerAriaLabel={t('rowActionsMenu')}
        mobileTriggerLabel={t('actionsTrigger')}
        sheetDescription={t('actionsSheetDescription')}
        sheetId={`inventar-actions-${row.id}`}
      />
    )
  }

  if (isDesktop) {
    const columns: SortableTableColumn<
      InventarStockSortKey | 'actions' | 'updatedBy' | 'category'
    >[] = [
      { id: 'name', label: t('name'), align: 'left', className: 'w-[12%]' },
      {
        id: 'category',
        label: t('category'),
        align: 'left',
        sortable: false,
        className: 'w-[10%]',
      },
      { id: 'storageZone', label: t('storageZone'), align: 'left', className: 'w-[8%]' },
      { id: 'pack', label: t('pack'), align: 'left', className: 'w-[8%]' },
      { id: 'onHand', label: t('currentStock'), align: 'right', className: 'w-[10%]' },
      { id: 'avgDailyOut', label: t('avgDailyOut'), align: 'right', className: 'w-[8%]' },
      { id: 'daysUntilRefill', label: t('daysUntilRefill'), align: 'right', className: 'w-[8%]' },
      { id: 'value', label: t('value'), align: 'right', className: 'w-[8%]' },
      { id: 'activity', label: t('activity'), align: 'left', className: 'w-[9%]' },
      {
        id: 'updatedBy',
        label: t('updatedBy'),
        align: 'left',
        sortable: false,
        className: 'w-[11%]',
      },
      { id: 'actions', label: '', sortable: false, className: 'w-[8%]' },
    ]

    return (
      <div className="[&_table]:table-fixed">
        <SortableTable
          columns={columns}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={(key) => {
            if (key === 'actions' || key === 'updatedBy' || key === 'category') return
            toggleSort(key)
          }}
        >
          {displayRows.map((row) => {
            const activityText = cardActivitySummary(row, t, locale)
            const { avgDailyOut, daysUntilRefill } = forecastCells(row)
            return (
              <TableRow key={row.id}>
                <TableCell className="max-w-0 font-medium">
                  <span className="block truncate" title={row.catalogItem.name}>
                    {row.catalogItem.name}
                  </span>
                </TableCell>
                <TableCell className="max-w-0 whitespace-nowrap">
                  <span className="block truncate">
                    {t(`categories.${row.catalogItem.category}`)}
                  </span>
                </TableCell>
                <TableCell className="max-w-0 whitespace-nowrap">
                  <span className="block truncate">
                    {t(`storageZones.${row.catalogItem.storageZone}`)}
                  </span>
                </TableCell>
                <TableCell className="max-w-0 whitespace-nowrap">
                  <span className="block truncate">
                    {formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <div className="flex justify-end">
                    <StockBadge
                      onHand={row.onHand}
                      packagesLabel={t('packages')}
                      minOnHand={row.minOnHand}
                      maxOnHand={row.maxOnHand}
                    />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {avgDailyOut}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {daysUntilRefill}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(stockLineValue(row))}
                </TableCell>
                <TableCell className="max-w-0 whitespace-nowrap text-sm">
                  <span
                    className={cn(
                      'block truncate',
                      row.lastInOn || row.lastOutOn ? undefined : 'text-muted-foreground',
                    )}
                    title={activityText}
                  >
                    {activityText}
                  </span>
                </TableCell>
                <TableCell className="max-w-0">
                  <UpdatedByCell actor={row.updatedBy} emptyLabel={t('updatedByEmpty')} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onUse(row)}>
                      {t('use')}
                    </Button>
                    {renderRowActions(row)}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </SortableTable>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {displayRows.map((row) => {
        const packLabel = formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)
        const zoneLabel = t(`storageZones.${row.catalogItem.storageZone}`)
        const metaLabel = `${zoneLabel} · ${packLabel}`
        const daysUntilRefillRaw = refillByCatalogId.get(row.catalogItemId)?.daysUntilRefill
        const showUrgentRefill =
          daysUntilRefillRaw != null &&
          Number.isFinite(daysUntilRefillRaw) &&
          daysUntilRefillRaw <= 3
        const urgentRefillLabel = showUrgentRefill
          ? formatDaysUntilRefill(daysUntilRefillRaw, locale, forecastEmpty)
          : null

        return (
          <li key={row.id}>
            <Card className="gap-3 py-3">
              <CardHeader className="px-4">
                <CardTitle className="truncate text-base font-medium" title={row.catalogItem.name}>
                  {row.catalogItem.name}
                </CardTitle>
                <CardDescription className="truncate" title={metaLabel}>
                  {metaLabel}
                </CardDescription>
                <CardAction>
                  <StockBadge
                    onHand={row.onHand}
                    packagesLabel={t('packages')}
                    minOnHand={row.minOnHand}
                    maxOnHand={row.maxOnHand}
                  />
                </CardAction>
              </CardHeader>
              {urgentRefillLabel != null ? (
                <CardContent className="px-4">
                  <Badge variant="outline" className="tabular-nums">
                    {t('daysUntilRefill')}: {urgentRefillLabel}
                  </Badge>
                </CardContent>
              ) : null}
              <CardFooter className="flex-col items-stretch gap-2 px-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full touch-manipulation"
                  onClick={() => onUse(row)}
                >
                  {t('use')}
                </Button>
                {renderRowActions(row)}
              </CardFooter>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
