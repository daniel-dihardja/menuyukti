'use client'

import { startTransition, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { INVENTORY_STORAGE_ZONE_SORT_ORDER } from '@/lib/inventar/storage-zones'
import { routes } from '@/lib/routes'

import { HistoryPanel } from './history-panel'
import { InventarAssistantShell } from './inventar-assistant-shell'
import { ReceiveForm } from './receive-form'
import { RemoveConfirm } from './remove-confirm'
import { StockList } from './stock-list'
import { StockToolbar } from './stock-toolbar'
import {
  resolveLocationCurrency,
  totalStockValue,
  type InventarBranch,
  type InventarCatalogOption,
} from './stock-utils'
import { TransferForm } from './transfer-form'
import { UseForm } from './use-form'

type Props = {
  branches: InventarBranch[]
  initialLocationId: number | null
  stockRows: InventoryStockRow[]
  catalogItems: InventarCatalogOption[]
}

export function InventarStockClient({
  branches,
  initialLocationId,
  stockRows,
  catalogItems,
}: Props) {
  const t = useTranslations('inventar')
  const locale = useLocale()
  const router = useRouter()
  const { setLocationId } = useAnalytics()

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveInitialCatalogId, setReceiveInitialCatalogId] = useState('')
  const [useRow, setUseRow] = useState<InventoryStockRow | null>(null)
  const [transferRow, setTransferRow] = useState<InventoryStockRow | null>(null)
  const [transferInitialDestId, setTransferInitialDestId] = useState('')
  const [removeRow, setRemoveRow] = useState<InventoryStockRow | null>(null)
  const [historyRow, setHistoryRow] = useState<InventoryStockRow | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const activeLocationId = initialLocationId

  const sortedStockRows = [...stockRows].toSorted((a, b) => {
    const zoneDiff =
      INVENTORY_STORAGE_ZONE_SORT_ORDER[a.catalogItem.storageZone] -
      INVENTORY_STORAGE_ZONE_SORT_ORDER[b.catalogItem.storageZone]
    if (zoneDiff !== 0) return zoneDiff
    return a.catalogItem.name.localeCompare(b.catalogItem.name)
  })

  const activeBranch = branches.find((b) => b.id === activeLocationId)
  const currencyCode = resolveLocationCurrency(activeBranch?.currency)
  const inventoryTotal = totalStockValue(sortedStockRows)

  function formatMoney(amount: number | null): string {
    if (amount == null) return t('priceEmpty')
    return formatCurrencyWithCode(amount, currencyCode, locale)
  }

  const transferDestinations = branches.filter((b) => b.id !== activeLocationId)
  const canTransfer = transferDestinations.length > 0
  const canBookDelivery = activeLocationId != null && catalogItems.length > 0
  const trackedCatalogIds = new Set(stockRows.map((row) => row.catalogItemId))

  function handleLocationChange(id: number | null) {
    if (id == null) return
    setLocationId(id)
    if (id !== initialLocationId) {
      router.replace(routes.inventarWithLocation(id))
    }
  }

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  function openBookDeliveryDialog() {
    const sortedCatalogItems = [...catalogItems].toSorted((a, b) => a.name.localeCompare(b.name))
    const preferred =
      sortedCatalogItems.find((item) => !trackedCatalogIds.has(item.id)) ?? sortedCatalogItems[0]
    setReceiveInitialCatalogId(preferred ? String(preferred.id) : '')
    setReceiveOpen(true)
  }

  function openTransferDialog(row: InventoryStockRow) {
    const [firstDest] = transferDestinations
    setTransferInitialDestId(firstDest ? String(firstDest.id) : '')
    setTransferRow(row)
  }

  return (
    <InventarAssistantShell
      open={assistantOpen}
      onOpenChange={setAssistantOpen}
      locationId={activeLocationId}
    >
      <div className="flex flex-col gap-6">
        <StockToolbar
          branches={branches}
          locationId={activeLocationId}
          onLocationChange={handleLocationChange}
          canBookDelivery={canBookDelivery}
          onBookDelivery={openBookDeliveryDialog}
          onOpenAssistant={() => setAssistantOpen(true)}
          totalValueLabel={stockRows.length > 0 ? formatMoney(inventoryTotal) : null}
        />

        <StockList
          activeLocationId={activeLocationId}
          sortedStockRows={sortedStockRows}
          catalogCount={catalogItems.length}
          currencyCode={currencyCode}
          onUse={setUseRow}
          onHistory={setHistoryRow}
          onTransfer={canTransfer ? openTransferDialog : undefined}
          onRemove={setRemoveRow}
          onBookDelivery={openBookDeliveryDialog}
        />

        <Link
          href={routes.inventarCatalog}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('managePantryItems')} →
        </Link>

        {receiveOpen && activeLocationId != null ? (
          <ReceiveForm
            key={receiveInitialCatalogId}
            locationId={activeLocationId}
            catalogItems={catalogItems}
            stockRows={stockRows}
            initialCatalogId={receiveInitialCatalogId}
            onClose={() => setReceiveOpen(false)}
            onSuccess={refresh}
          />
        ) : null}

        {useRow != null && activeLocationId != null ? (
          <UseForm
            key={useRow.id}
            row={useRow}
            locationId={activeLocationId}
            onClose={() => setUseRow(null)}
            onSuccess={refresh}
          />
        ) : null}

        {transferRow != null ? (
          <TransferForm
            key={transferRow.id}
            row={transferRow}
            destinations={transferDestinations}
            initialDestinationId={transferInitialDestId}
            onClose={() => setTransferRow(null)}
            onSuccess={refresh}
          />
        ) : null}

        {historyRow != null && activeLocationId != null ? (
          <HistoryPanel
            key={historyRow.id}
            row={historyRow}
            locationId={activeLocationId}
            branches={branches}
            onClose={() => setHistoryRow(null)}
          />
        ) : null}

        {removeRow != null && activeLocationId != null ? (
          <RemoveConfirm
            key={removeRow.id}
            row={removeRow}
            locationId={activeLocationId}
            onClose={() => setRemoveRow(null)}
            onSuccess={refresh}
          />
        ) : null}
      </div>
    </InventarAssistantShell>
  )
}
