'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeftRight, History, Package, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
import type {
  InventoryStockMovement,
  InventoryStockRow,
} from '@/lib/graphql/queries/inventory-stock'
import { INVENTORY_STORAGE_ZONE_SORT_ORDER } from '@/lib/inventar/storage-zones'
import { routes } from '@/lib/routes'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'

import { formatPackLabel } from './format-pack'

function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatActivityDate(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StockBadge({ onHand, packagesLabel }: { onHand: number; packagesLabel: string }) {
  const isLow = onHand <= 1
  return (
    <Badge variant={isLow ? 'destructive' : 'secondary'} className="tabular-nums">
      {onHand} {packagesLabel}
    </Badge>
  )
}

function cardActivitySummary(
  row: InventoryStockRow,
  t: (key: string, values?: Record<string, string>) => string,
  locale: string,
): string {
  const lastIn = row.lastInOn
  const lastOut = row.lastOutOn
  if (lastIn && lastOut) {
    if (lastOut >= lastIn) {
      return t('activityOut', { date: formatActivityDate(lastOut, locale) })
    }
    return t('activityIn', { date: formatActivityDate(lastIn, locale) })
  }
  if (lastOut) return t('activityOut', { date: formatActivityDate(lastOut, locale) })
  if (lastIn) return t('activityIn', { date: formatActivityDate(lastIn, locale) })
  return t('activityInEmpty')
}

function FormSurface({
  isDesktop,
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  isDesktop: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
}) {
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0">
        <DrawerHeader className="shrink-0 gap-1 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className={description ? undefined : 'sr-only'}>
            {description ?? title}
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
        <DrawerFooter className="shrink-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
          {footer}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

type Branch = { id: number; name: string }

type Props = {
  branches: Branch[]
  initialLocationId: number | null
  stockRows: InventoryStockRow[]
  catalogItems: InventoryCatalogItem[]
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
  const { locationId, setLocationId } = useAnalytics()
  const isDesktop = useDesktopLayout()

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [useRow, setUseRow] = useState<InventoryStockRow | null>(null)
  const [transferRow, setTransferRow] = useState<InventoryStockRow | null>(null)
  const [removeRow, setRemoveRow] = useState<InventoryStockRow | null>(null)
  const [historyRow, setHistoryRow] = useState<InventoryStockRow | null>(null)
  const [movements, setMovements] = useState<InventoryStockMovement[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('')
  const [receiveQty, setReceiveQty] = useState('1')
  const [receiveDate, setReceiveDate] = useState(todayIsoDate)
  const [useQty, setUseQty] = useState('1')
  const [useDate, setUseDate] = useState(todayIsoDate)
  const [transferDestinationId, setTransferDestinationId] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('')

  useEffect(() => {
    if (initialLocationId !== null) {
      setLocationId(initialLocationId)
    }
  }, [initialLocationId, setLocationId])

  useEffect(() => {
    if (initialLocationId !== null) return
    if (locationId !== null) {
      if (branches.length > 0 && !branches.some((b) => b.id === locationId)) {
        setLocationId(null)
      }
      return
    }
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (onlyBranch) setLocationId(onlyBranch.id)
  }, [initialLocationId, locationId, branches, setLocationId])

  useEffect(() => {
    if (locationId === null) return
    if (locationId === initialLocationId) return
    router.replace(routes.inventarWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  const activeLocationId = locationId ?? initialLocationId

  useEffect(() => {
    if (historyRow == null || activeLocationId == null) {
      setMovements(null)
      return
    }
    let cancelled = false
    setHistoryLoading(true)
    setMovements(null)
    void (async () => {
      try {
        const params = new URLSearchParams({
          locationId: String(activeLocationId),
          catalogItemId: String(historyRow.catalogItemId),
          stockId: String(historyRow.id),
        })
        const res = await fetch(`/api/inventory-stock?${params}`)
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { message?: string } | null
          throw new Error(payload?.message ?? t('errorGeneric'))
        }
        const payload = (await res.json()) as { movements: InventoryStockMovement[] }
        if (!cancelled) setMovements(payload.movements)
      } catch (error) {
        if (!cancelled) {
          setMovements([])
          toast.error(error instanceof Error ? error.message : t('errorGeneric'))
        }
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [historyRow, activeLocationId, t])

  const sortedStockRows = [...stockRows].toSorted((a, b) => {
    const zoneDiff =
      INVENTORY_STORAGE_ZONE_SORT_ORDER[a.catalogItem.storageZone] -
      INVENTORY_STORAGE_ZONE_SORT_ORDER[b.catalogItem.storageZone]
    if (zoneDiff !== 0) return zoneDiff
    return a.catalogItem.name.localeCompare(b.catalogItem.name)
  })

  const useQtyAmount = Number(useQty)
  const useNewStock =
    useRow != null &&
    Number.isFinite(useQtyAmount) &&
    useQtyAmount >= 0 &&
    useQtyAmount <= useRow.onHand
      ? useRow.onHand - useQtyAmount
      : null

  const transferDestinations = branches.filter((b) => b.id !== activeLocationId)
  const canTransfer = transferDestinations.length > 0
  const transferQtyAmount = Number(transferQuantity)
  const transferRemaining =
    transferRow != null &&
    Number.isFinite(transferQtyAmount) &&
    transferQtyAmount > 0 &&
    transferQtyAmount <= transferRow.onHand
      ? transferRow.onHand - transferQtyAmount
      : null

  const trackedCatalogIds = new Set(stockRows.map((row) => row.catalogItemId))
  const canBookDelivery = activeLocationId != null && catalogItems.length > 0

  const sortedCatalogItems = [...catalogItems].toSorted((a, b) => a.name.localeCompare(b.name))

  const receivePreviewCatalogId = Number(selectedCatalogId)
  const receivePreviewRow = Number.isInteger(receivePreviewCatalogId)
    ? stockRows.find((r) => r.catalogItemId === receivePreviewCatalogId)
    : undefined
  const receiveQtyAmount = Number(receiveQty)
  const receiveNewStock =
    Number.isFinite(receiveQtyAmount) && receiveQtyAmount > 0
      ? (receivePreviewRow?.onHand ?? 0) + receiveQtyAmount
      : null

  function openBookDeliveryDialog() {
    const preferred =
      sortedCatalogItems.find((item) => !trackedCatalogIds.has(item.id)) ?? sortedCatalogItems[0]
    setSelectedCatalogId(preferred ? String(preferred.id) : '')
    setReceiveQty('1')
    setReceiveDate(todayIsoDate())
    setReceiveOpen(true)
  }

  function openUseDialog(row: InventoryStockRow) {
    setUseRow(row)
    setUseQty('1')
    setUseDate(todayIsoDate())
  }

  function openTransferDialog(row: InventoryStockRow) {
    const [firstDest] = transferDestinations
    setTransferRow(row)
    setTransferDestinationId(firstDest ? String(firstDest.id) : '')
    setTransferQuantity(String(row.onHand))
  }

  function buildRowActionItems(row: InventoryStockRow): ResponsiveActionMenuItem[] {
    const items: ResponsiveActionMenuItem[] = [
      {
        id: 'history',
        label: t('history'),
        icon: History,
        onSelect: () => setHistoryRow(row),
      },
    ]
    if (canTransfer) {
      items.push({
        id: 'transfer',
        label: t('transfer'),
        icon: ArrowLeftRight,
        onSelect: () => openTransferDialog(row),
      })
    }
    items.push({
      id: 'remove',
      label: t('removeFromLocation'),
      icon: Trash2,
      destructive: true,
      separatorBefore: true,
      onSelect: () => setRemoveRow(row),
    })
    return items
  }

  async function refresh() {
    router.refresh()
  }

  async function handleBookDelivery() {
    if (activeLocationId == null) return
    const catalogItemId = Number(selectedCatalogId)
    if (!Number.isInteger(catalogItemId) || catalogItemId < 1) {
      toast.error(t('validation.pantryItemRequired'))
      return
    }
    const quantity = Number(receiveQty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error(t('validation.quantityPositive'))
      return
    }
    if (!receiveDate) {
      toast.error(t('validation.occurredOnRequired'))
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/inventory-stock?mode=receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: activeLocationId,
          catalogItemId,
          quantity,
          occurredOn: receiveDate,
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setReceiveOpen(false)
      setSelectedCatalogId('')
      setReceiveQty('1')
      toast.success(t('bookDeliverySuccess'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleUseStock() {
    if (useRow == null || activeLocationId == null) return
    const quantity = Number(useQty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error(t('validation.quantityPositive'))
      return
    }
    if (quantity > useRow.onHand) {
      toast.error(t('validation.quantityTooMuch'))
      return
    }
    if (!useDate) {
      toast.error(t('validation.occurredOnRequired'))
      return
    }
    setPending(true)
    try {
      const params = new URLSearchParams({
        locationId: String(activeLocationId),
        catalogItemId: String(useRow.catalogItemId),
      })
      const res = await fetch(`/api/inventory-stock/${useRow.id}?${params}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, occurredOn: useDate }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setUseRow(null)
      toast.success(t('useStock'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleRemoveStock() {
    if (removeRow == null || activeLocationId == null) return
    setPending(true)
    try {
      const params = new URLSearchParams({
        locationId: String(activeLocationId),
        catalogItemId: String(removeRow.catalogItemId),
      })
      const res = await fetch(`/api/inventory-stock/${removeRow.id}?${params}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setRemoveRow(null)
      toast.success(t('removeFromLocation'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleTransferStock() {
    if (transferRow == null) return
    if (!transferDestinationId) {
      toast.error(t('validation.destinationRequired'))
      return
    }
    const quantity = Number(transferQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error(t('validation.quantityPositive'))
      return
    }
    if (quantity > transferRow.onHand) {
      toast.error(t('validation.quantityTooMuch'))
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/inventory-stock?mode=transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStockId: transferRow.id,
          toLocationId: Number(transferDestinationId),
          quantity,
          occurredOn: todayIsoDate(),
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setTransferRow(null)
      setTransferDestinationId('')
      setTransferQuantity('')
      toast.success(t('transferStock'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  function directionLabel(movement: InventoryStockMovement): string {
    const relatedName =
      movement.relatedLocationId != null
        ? branches.find((branch) => branch.id === movement.relatedLocationId)?.name
        : undefined

    switch (movement.direction) {
      case 'in':
        return t('directionIn')
      case 'out':
        return t('directionOut')
      case 'transfer_in':
        return relatedName
          ? t('directionTransferInFrom', { location: relatedName })
          : t('directionTransferIn')
      case 'transfer_out':
        return relatedName
          ? t('directionTransferOutTo', { location: relatedName })
          : t('directionTransferOut')
      default:
        return movement.direction
    }
  }

  function signedQuantity(
    direction: InventoryStockMovement['direction'],
    quantity: number,
  ): string {
    const isOut = direction === 'out' || direction === 'transfer_out'
    return `${isOut ? '−' : '+'}${quantity}`
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

  const historyHeaderMeta = historyRow ? (
    <>
      <p
        className="truncate text-sm text-muted-foreground"
        title={`${historyRow.catalogItem.name} (${formatPackLabel(historyRow.catalogItem.packageSize, historyRow.catalogItem.packageUnit)})`}
      >
        {historyRow.catalogItem.name} (
        {formatPackLabel(historyRow.catalogItem.packageSize, historyRow.catalogItem.packageUnit)})
      </p>
      <div className="pt-1">
        <StockBadge onHand={historyRow.onHand} packagesLabel={t('packages')} />
      </div>
    </>
  ) : null

  const historyBody = (
    <div className="flex flex-col gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {historyLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      ) : movements == null || movements.length === 0 ? (
        <Empty className="border-0 p-0 md:p-4">
          <EmptyHeader>
            <EmptyTitle>{t('historyEmptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('historyEmpty')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y">
          {movements.map((movement) => (
            <li
              key={movement.id}
              className="flex items-baseline justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {formatActivityDate(movement.occurredOn, locale)} ·{' '}
                  {directionLabel(movement)}
                </p>
              </div>
              <span className="shrink-0 tabular-nums font-medium">
                {signedQuantity(movement.direction, movement.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const receiveFields = (
    <FieldGroup>
      <Field>
        <FieldLabel>{t('selectPantryItem')}</FieldLabel>
        <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
          <SelectTrigger className="min-h-11 touch-manipulation lg:min-h-9">
            <SelectValue placeholder={t('selectPantryItemPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sortedCatalogItems.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name} ({formatPackLabel(item.packageSize, item.packageUnit)})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="inventar-receive-qty">{t('packagesIn')}</FieldLabel>
        <Input
          id="inventar-receive-qty"
          className="min-h-11 touch-manipulation lg:min-h-9"
          inputMode="decimal"
          value={receiveQty}
          onChange={(e) => setReceiveQty(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="inventar-receive-date">{t('arrivedOn')}</FieldLabel>
        <Input
          id="inventar-receive-date"
          className="min-h-11 touch-manipulation lg:min-h-9"
          type="date"
          value={receiveDate}
          onChange={(e) => setReceiveDate(e.target.value)}
        />
      </Field>
      {receiveNewStock != null ? (
        <p className="text-sm text-muted-foreground">
          {t('newStock')}:{' '}
          <span className="font-medium tabular-nums text-foreground">
            {receiveNewStock} {t('packages')}
          </span>
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t('addNewPantryItemPrompt')}{' '}
        <Link
          href={routes.inventarCatalog}
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setReceiveOpen(false)}
        >
          {t('addPantryItem')}
        </Link>
      </p>
    </FieldGroup>
  )

  const useFields =
    useRow != null ? (
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          {useRow.catalogItem.name} (
          {formatPackLabel(useRow.catalogItem.packageSize, useRow.catalogItem.packageUnit)})
        </p>
        <Field>
          <FieldLabel>{t('currentStock')}</FieldLabel>
          <StockBadge onHand={useRow.onHand} packagesLabel={t('packages')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="inventar-use-qty">{t('packagesOut')}</FieldLabel>
          <Input
            id="inventar-use-qty"
            className="min-h-11 touch-manipulation lg:min-h-9"
            inputMode="decimal"
            min={0}
            value={useQty}
            onChange={(e) => setUseQty(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="inventar-use-date">{t('usedOn')}</FieldLabel>
          <Input
            id="inventar-use-date"
            className="min-h-11 touch-manipulation lg:min-h-9"
            type="date"
            value={useDate}
            onChange={(e) => setUseDate(e.target.value)}
          />
        </Field>
        {useNewStock != null ? (
          <p className="text-sm text-muted-foreground">
            {t('newStock')}:{' '}
            <span className="font-medium tabular-nums text-foreground">
              {useNewStock} {t('packages')}
            </span>
          </p>
        ) : null}
      </FieldGroup>
    ) : null

  const transferFields =
    transferRow != null ? (
      <FieldGroup>
        <Field>
          <FieldLabel>{t('currentStock')}</FieldLabel>
          <StockBadge onHand={transferRow.onHand} packagesLabel={t('packages')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="inventar-transfer-destination">
            {t('destinationLocation')}
          </FieldLabel>
          <Select value={transferDestinationId} onValueChange={setTransferDestinationId}>
            <SelectTrigger
              id="inventar-transfer-destination"
              className="min-h-11 touch-manipulation lg:min-h-9"
            >
              <SelectValue placeholder={t('destinationPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {transferDestinations.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="inventar-transfer-quantity">{t('quantity')}</FieldLabel>
          <Input
            id="inventar-transfer-quantity"
            className="min-h-11 touch-manipulation lg:min-h-9"
            inputMode="decimal"
            min={0}
            value={transferQuantity}
            onChange={(e) => setTransferQuantity(e.target.value)}
          />
          {transferRemaining != null ? (
            <FieldDescription>
              {t('remainingAfterTransfer')}:{' '}
              <span className="font-medium tabular-nums text-foreground">
                {transferRemaining} {t('packages')}
              </span>
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>
    ) : null

  return (
    <div className="flex flex-col gap-6">
      <p className="hidden text-pretty text-sm text-muted-foreground sm:block">{t('trustLine')}</p>

      <div
        className={cn(
          'sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur',
          'lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
        )}
      >
        {branches.length > 0 ? (
          <LocationSelect
            branches={branches}
            id="inventar-location-select"
            label={t('branchLabel')}
            placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
            description={t('branchDescription')}
            className="w-full max-w-none sm:max-w-xs"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="min-h-11 w-full touch-manipulation sm:w-auto lg:min-h-9"
            disabled={!canBookDelivery}
            onClick={openBookDeliveryDialog}
          >
            {t('bookDelivery')}
          </Button>
        </div>
      </div>

      {activeLocationId == null ? (
        <p className="text-sm text-muted-foreground">{t('branchPlaceholder')}</p>
      ) : stockRows.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {catalogItems.length === 0 ? t('catalogEmptyOnStockTitle') : t('stockEmpty')}
            </EmptyTitle>
            <EmptyDescription>
              {catalogItems.length === 0 ? t('catalogEmptyOnStock') : t('stockEmptyHint')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {catalogItems.length === 0 ? (
              <Button asChild className="min-h-11 touch-manipulation lg:min-h-9">
                <Link href={routes.inventarCatalog}>{t('addPantryItem')}</Link>
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11 touch-manipulation lg:min-h-9"
                onClick={openBookDeliveryDialog}
              >
                {t('bookDelivery')}
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">
            {sortedStockRows.map((row) => {
              const packLabel = formatPackLabel(
                row.catalogItem.packageSize,
                row.catalogItem.packageUnit,
              )
              const zoneLabel = t(`storageZones.${row.catalogItem.storageZone}`)
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={row.catalogItem.name}>
                        {row.catalogItem.name}
                      </p>
                      <p
                        className="truncate text-sm text-muted-foreground"
                        title={`${zoneLabel} · ${packLabel}`}
                      >
                        {zoneLabel} · {packLabel}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {cardActivitySummary(row, t, locale)}
                      </p>
                    </div>
                    <StockBadge onHand={row.onHand} packagesLabel={t('packages')} />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full touch-manipulation"
                    onClick={() => openUseDialog(row)}
                  >
                    {t('use')}
                  </Button>
                  {renderRowActions(row)}
                </li>
              )
            })}
          </ul>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('storageZone')}</TableHead>
                  <TableHead>{t('pack')}</TableHead>
                  <TableHead className="text-right">{t('currentStock')}</TableHead>
                  <TableHead>{t('activity')}</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStockRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <span className="truncate" title={row.catalogItem.name}>
                        {row.catalogItem.name}
                      </span>
                    </TableCell>
                    <TableCell>{t(`storageZones.${row.catalogItem.storageZone}`)}</TableCell>
                    <TableCell>
                      {formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <StockBadge onHand={row.onHand} packagesLabel={t('packages')} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className={row.lastInOn ? undefined : 'text-muted-foreground'}>
                          {row.lastInOn
                            ? t('activityIn', { date: formatActivityDate(row.lastInOn, locale) })
                            : t('activityInEmpty')}
                        </span>
                        <span className={row.lastOutOn ? undefined : 'text-muted-foreground'}>
                          {row.lastOutOn
                            ? t('activityOut', { date: formatActivityDate(row.lastOutOn, locale) })
                            : t('activityOutEmpty')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openUseDialog(row)}
                        >
                          {t('use')}
                        </Button>
                        {renderRowActions(row)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Link
        href={routes.inventarCatalog}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t('managePantryItems')} →
      </Link>

      <FormSurface
        isDesktop={isDesktop}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title={t('bookDeliveryTitle')}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setReceiveOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleBookDelivery()}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t('bookDelivery')}
            </Button>
          </>
        }
      >
        {receiveFields}
      </FormSurface>

      <FormSurface
        isDesktop={isDesktop}
        open={useRow != null}
        onOpenChange={(open) => {
          if (!open) setUseRow(null)
        }}
        title={t('useStock')}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setUseRow(null)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleUseStock()}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t('use')}
            </Button>
          </>
        }
      >
        {useFields}
      </FormSurface>

      <FormSurface
        isDesktop={isDesktop}
        open={transferRow != null}
        onOpenChange={(open) => {
          if (!open) {
            setTransferRow(null)
            setTransferDestinationId('')
            setTransferQuantity('')
          }
        }}
        title={t('transferStock')}
        description={
          transferRow
            ? `${transferRow.catalogItem.name} (${formatPackLabel(
                transferRow.catalogItem.packageSize,
                transferRow.catalogItem.packageUnit,
              )})`
            : undefined
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setTransferRow(null)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleTransferStock()}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t('transfer')}
            </Button>
          </>
        }
      >
        {transferFields}
      </FormSurface>

      {isDesktop ? (
        <Sheet
          open={historyRow != null}
          onOpenChange={(open) => {
            if (!open) setHistoryRow(null)
          }}
        >
          <SheetContent
            closeLabel={t('close')}
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          >
            <SheetHeader className="shrink-0 border-b pr-12">
              <SheetTitle>{t('historyTitle')}</SheetTitle>
              {historyRow ? (
                <>
                  <SheetDescription className="truncate" title={historyRow.catalogItem.name}>
                    {historyRow.catalogItem.name} (
                    {formatPackLabel(
                      historyRow.catalogItem.packageSize,
                      historyRow.catalogItem.packageUnit,
                    )}
                    )
                  </SheetDescription>
                  <div className="pt-1">
                    <StockBadge onHand={historyRow.onHand} packagesLabel={t('packages')} />
                  </div>
                </>
              ) : null}
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">{historyBody}</ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer
          open={historyRow != null}
          onOpenChange={(open) => {
            if (!open) setHistoryRow(null)
          }}
        >
          <DrawerContent className="flex max-h-[min(85dvh,640px)] flex-col gap-0">
            <DrawerHeader className="shrink-0 gap-1 border-b text-left">
              <DrawerTitle>{t('historyTitle')}</DrawerTitle>
              <DrawerDescription className="sr-only">{t('historyTitle')}</DrawerDescription>
              {historyHeaderMeta}
            </DrawerHeader>
            <ScrollArea className="min-h-0 flex-1">{historyBody}</ScrollArea>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog
        open={removeRow != null}
        onOpenChange={(open) => {
          if (!open) setRemoveRow(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeFromLocation')}</AlertDialogTitle>
            <AlertDialogDescription>{t('removeFromLocationConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void handleRemoveStock()}>
              {t('removeFromLocation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
