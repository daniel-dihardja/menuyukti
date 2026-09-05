'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import type {
  InventoryStockMovement,
  InventoryStockRow,
} from '@/lib/graphql/queries/inventory-stock'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { formatPackLabel } from './format-pack'
import { StockBadge } from './stock-badge'
import {
  formatActivityDate,
  inventarErrorMessage,
  rangeForPreset,
  type HistoryDatePreset,
  type InventarApiErrorPayload,
  type InventarBranch,
} from './stock-utils'
import { UpdatedByCell } from './updated-by-cell'

const CUSTOM_DATE_DEBOUNCE_MS = 300

type Props = {
  row: InventoryStockRow
  locationId: number
  branches: InventarBranch[]
  onClose: () => void
}

export function HistoryPanel({ row, locationId, branches, onClose }: Props) {
  const t = useTranslations('inventar')
  const locale = useLocale()
  const isDesktop = useDesktopLayout()

  const [historyPreset, setHistoryPreset] = useState<HistoryDatePreset>('30d')
  const [historyFrom, setHistoryFrom] = useState(() => rangeForPreset('30d').fromDate)
  const [historyTo, setHistoryTo] = useState(() => rangeForPreset('30d').toDate)
  const [debouncedFrom, setDebouncedFrom] = useState(historyFrom)
  const [debouncedTo, setDebouncedTo] = useState(historyTo)
  const [movements, setMovements] = useState<InventoryStockMovement[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const locationNameById = new Map(branches.map((branch) => [branch.id, branch.name]))

  useEffect(() => {
    if (historyPreset !== 'custom') {
      setDebouncedFrom(historyFrom)
      setDebouncedTo(historyTo)
      return
    }
    const timer = window.setTimeout(() => {
      setDebouncedFrom(historyFrom)
      setDebouncedTo(historyTo)
    }, CUSTOM_DATE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [historyPreset, historyFrom, historyTo])

  const reportHistoryError = useEffectEvent((payload: InventarApiErrorPayload | null) => {
    toast.error(inventarErrorMessage(payload, t))
  })

  const historyRowId = row.id
  const catalogItemId = row.catalogItemId

  useEffect(() => {
    let fromDate: string | undefined
    let toDate: string | undefined
    if (historyPreset === '7d' || historyPreset === '30d') {
      const range = rangeForPreset(historyPreset)
      fromDate = range.fromDate
      toDate = range.toDate
    } else if (historyPreset === 'custom') {
      if (!debouncedFrom || !debouncedTo || debouncedFrom > debouncedTo) {
        setMovements([])
        setHistoryLoading(false)
        return
      }
      fromDate = debouncedFrom
      toDate = debouncedTo
    }

    const controller = new AbortController()
    setHistoryLoading(true)
    setMovements(null)

    void (async () => {
      try {
        const params = new URLSearchParams({
          locationId: String(locationId),
          catalogItemId: String(catalogItemId),
          stockId: String(historyRowId),
        })
        if (fromDate != null) params.set('fromDate', fromDate)
        if (toDate != null) params.set('toDate', toDate)
        const res = await fetch(`/api/inventory-stock?${params}`, { signal: controller.signal })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
          throw payload
        }
        const payload = (await res.json()) as { movements: InventoryStockMovement[] }
        if (!controller.signal.aborted) setMovements(payload.movements)
      } catch (error) {
        if (controller.signal.aborted) return
        setMovements([])
        reportHistoryError(
          error != null && typeof error === 'object' && 'code' in error
            ? (error as InventarApiErrorPayload)
            : null,
        )
      } finally {
        if (!controller.signal.aborted) setHistoryLoading(false)
      }
    })()

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reportHistoryError is useEffectEvent
  }, [historyRowId, catalogItemId, locationId, historyPreset, debouncedFrom, debouncedTo])

  function applyHistoryPreset(preset: '7d' | '30d' | 'all') {
    setHistoryPreset(preset)
    if (preset === 'all') {
      setHistoryFrom('')
      setHistoryTo('')
      return
    }
    const range = rangeForPreset(preset)
    setHistoryFrom(range.fromDate)
    setHistoryTo(range.toDate)
  }

  function directionLabel(movement: InventoryStockMovement): string {
    const relatedName =
      movement.relatedLocationId != null
        ? locationNameById.get(movement.relatedLocationId)
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

  const historyHeaderMeta = (
    <>
      <p
        className="truncate text-sm text-muted-foreground"
        title={`${row.catalogItem.name} (${formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)})`}
      >
        {row.catalogItem.name} (
        {formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)})
      </p>
      <div className="pt-1">
        <StockBadge
          onHand={row.onHand}
          packagesLabel={t('packages')}
          minOnHand={row.catalogItem.minOnHand}
          maxOnHand={row.catalogItem.maxOnHand}
        />
      </div>
    </>
  )

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
            <EmptyTitle>
              {historyPreset === 'all' ? t('historyEmptyTitle') : t('historyEmptyFilteredTitle')}
            </EmptyTitle>
            <EmptyDescription>
              {historyPreset === 'all' ? t('historyEmpty') : t('historyEmptyFiltered')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y">
          {movements.map((movement) => (
            <li
              key={movement.id}
              className="flex items-start justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {formatActivityDate(movement.occurredOn, locale)} · {directionLabel(movement)}
                </p>
                <div className="mt-1.5">
                  <UpdatedByCell actor={movement.createdBy} emptyLabel={t('updatedByEmpty')} />
                </div>
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

  const historyFilters = (
    <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: '7d' as const, label: t('historyPreset7d') },
            { id: '30d' as const, label: t('historyPreset30d') },
            { id: 'all' as const, label: t('historyPresetAll') },
          ] as const
        ).map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={historyPreset === preset.id ? 'secondary' : 'outline'}
            className="touch-manipulation"
            onClick={() => applyHistoryPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t('historyFrom')}</FieldLabel>
          <DatePicker
            value={historyFrom || undefined}
            onChange={(date) => {
              setHistoryPreset('custom')
              setHistoryFrom(date)
            }}
            placeholder={t('datePlaceholder')}
          />
        </Field>
        <Field>
          <FieldLabel>{t('historyTo')}</FieldLabel>
          <DatePicker
            value={historyTo || undefined}
            onChange={(date) => {
              setHistoryPreset('custom')
              setHistoryTo(date)
            }}
            placeholder={t('datePlaceholder')}
          />
        </Field>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <SheetContent
          closeLabel={t('close')}
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="shrink-0 border-b pr-12">
            <SheetTitle>{t('historyTitle')}</SheetTitle>
            <SheetDescription className="truncate" title={row.catalogItem.name}>
              {row.catalogItem.name} (
              {formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)})
            </SheetDescription>
            <div className="pt-1">
              <StockBadge
                onHand={row.onHand}
                packagesLabel={t('packages')}
                minOnHand={row.catalogItem.minOnHand}
                maxOnHand={row.catalogItem.maxOnHand}
              />
            </div>
          </SheetHeader>
          {historyFilters}
          <ScrollArea className="min-h-0 flex-1">{historyBody}</ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DrawerContent className="flex max-h-[min(85dvh,640px)] flex-col gap-0">
        <DrawerHeader className="shrink-0 gap-1 border-b text-left">
          <DrawerTitle>{t('historyTitle')}</DrawerTitle>
          <DrawerDescription className="sr-only">{t('historyTitle')}</DrawerDescription>
          {historyHeaderMeta}
        </DrawerHeader>
        {historyFilters}
        <ScrollArea className="min-h-0 flex-1">{historyBody}</ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
