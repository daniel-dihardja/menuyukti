'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { cn } from '@workspace/ui/lib/utils'

import type { LocationMenu, LocationMenuItem } from '@/lib/graphql/queries/location-menu'
import type {
  PosOrder,
  PosOrderStatus,
  PosPaymentMethod,
} from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

import { PosReceipt } from './pos-receipt'

type TodayFilter = 'all' | PosOrderStatus
type DiscountMode = 'amount' | 'percent'

const TODAY_FILTERS: TodayFilter[] = ['all', 'OPEN', 'PAID', 'VOID', 'REFUNDED']

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

type PosCashierProps = {
  locationId: number
  locationName: string
  currencyCode: string
  initialMenu: LocationMenu | null
  initialOrders: PosOrder[]
}

async function posAction(
  locationId: number,
  body: Record<string, unknown>,
): Promise<PosOrder> {
  const res = await fetch(`/api/locations/${locationId}/pos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await res.json()) as { order?: PosOrder; error?: string }
  if (!res.ok || !payload.order) {
    throw new Error(payload.error || 'POS action failed')
  }
  return payload.order
}

export function PosCashier({
  locationId,
  locationName,
  currencyCode,
  initialMenu,
  initialOrders,
}: PosCashierProps) {
  const t = useTranslations('pos')
  const [pending, startTransition] = useTransition()
  const [currentOrder, setCurrentOrder] = useState<PosOrder | null>(null)
  const [todayOrders, setTodayOrders] = useState<PosOrder[]>(initialOrders)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')
  const [discountInput, setDiscountInput] = useState('0')
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount')
  const [tableLabelInput, setTableLabelInput] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [todayFilter, setTodayFilter] = useState<TodayFilter>('all')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false)

  const isEditable = currentOrder?.status === 'OPEN'
  const canShowReceipt =
    currentOrder != null && (currentOrder.status === 'PAID' || currentOrder.status === 'REFUNDED')
  const canRefund = currentOrder?.status === 'PAID'
  const categories = initialMenu?.categories ?? []
  const availableItems = categories.flatMap((category) =>
    category.items
      .filter((item) => item.isAvailable)
      .map((item) => ({ ...item, categoryName: category.name })),
  )
  const filteredItems =
    selectedCategoryId === 'all'
      ? availableItems
      : availableItems.filter((item) => item.categoryId === selectedCategoryId)
  const filteredTodayOrders =
    todayFilter === 'all'
      ? todayOrders
      : todayOrders.filter((order) => order.status === todayFilter)

  const subtotal = currentOrder?.lines.reduce((sum, line) => sum + line.lineTotal, 0) ?? 0
  const discount = currentOrder?.discountAmount ?? 0
  const total = Math.max(0, subtotal - discount)
  const discountInputValue = Number(discountInput)
  const percentPreviewAmount =
    discountMode === 'percent' &&
    Number.isFinite(discountInputValue) &&
    discountInputValue >= 0 &&
    discountInputValue <= 100
      ? roundMoney((subtotal * discountInputValue) / 100)
      : null

  const showOrder = (order: PosOrder | null) => {
    setCurrentOrder(order)
    setDiscountMode('amount')
    setDiscountInput(String(order?.discountAmount ?? 0))
    setTableLabelInput(order?.tableLabel ?? '')
    setPayOpen(false)
  }

  const handleDiscountModeChange = (mode: DiscountMode) => {
    if (mode === discountMode) return
    const current = Number(discountInput)
    if (mode === 'percent') {
      if (Number.isFinite(current) && current >= 0 && subtotal > 0) {
        setDiscountInput(String(roundMoney((current / subtotal) * 100)))
      } else {
        setDiscountInput('0')
      }
    } else if (Number.isFinite(current) && current >= 0 && current <= 100) {
      setDiscountInput(String(roundMoney((subtotal * current) / 100)))
    } else {
      setDiscountInput('0')
    }
    setDiscountMode(mode)
  }

  const refreshToday = async (preferredOrderId?: number | null) => {
    const res = await fetch(`/api/locations/${locationId}/pos`)
    const payload = (await res.json()) as { orders?: PosOrder[]; error?: string }
    if (!res.ok || !payload.orders) return
    setTodayOrders(payload.orders)
    if (preferredOrderId != null) {
      const match = payload.orders.find((order) => order.id === preferredOrderId)
      if (match) showOrder(match)
    }
  }

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      void (async () => {
        try {
          await fn()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('errors.generic'))
        }
      })()
    })
  }

  const ensureOpenOrder = async (): Promise<PosOrder> => {
    if (currentOrder && currentOrder.status === 'OPEN') {
      return currentOrder
    }
    const order = await posAction(locationId, { action: 'open' })
    showOrder(order)
    await refreshToday(order.id)
    return order
  }

  const handleSelectTicket = (order: PosOrder) => {
    showOrder(order)
  }

  const handleAddItem = (item: LocationMenuItem) => {
    run(async () => {
      const order = await ensureOpenOrder()
      const updated = await posAction(locationId, {
        action: 'addLine',
        orderId: order.id,
        menuItemId: item.id,
        qty: 1,
      })
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handleUpdateQty = (lineId: number, qty: number) => {
    if (qty < 1 || !isEditable) return
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'updateLine',
        lineId,
        qty,
      })
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handleRemoveLine = (lineId: number) => {
    if (!isEditable) return
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'removeLine',
        lineId,
      })
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handleApplyDiscount = () => {
    if (!currentOrder || !isEditable) return
    const raw = Number(discountInput)
    if (!Number.isFinite(raw) || raw < 0) {
      toast.error(
        discountMode === 'percent' ? t('errors.invalidDiscountPercent') : t('errors.invalidDiscount'),
      )
      return
    }
    let amount = raw
    if (discountMode === 'percent') {
      if (raw > 100) {
        toast.error(t('errors.invalidDiscountPercent'))
        return
      }
      amount = roundMoney((subtotal * raw) / 100)
    }
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'setDiscount',
        orderId: currentOrder.id,
        amount,
      })
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handleApplyTableLabel = () => {
    if (!currentOrder || !isEditable) return
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'setTableLabel',
        orderId: currentOrder.id,
        tableLabel: tableLabelInput,
      })
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handleClearTableLabel = () => {
    if (!currentOrder || !isEditable) return
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'setTableLabel',
        orderId: currentOrder.id,
        tableLabel: null,
      })
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handlePay = (paymentMethod: PosPaymentMethod) => {
    if (!currentOrder || !isEditable) return
    run(async () => {
      const paid = await posAction(locationId, {
        action: 'close',
        orderId: currentOrder.id,
        paymentMethod,
      })
      toast.success(t('paidToast', { bill: paid.billNumber }))
      showOrder(paid)
      await refreshToday(paid.id)
      setReceiptOpen(true)
    })
  }

  const handleVoid = () => {
    if (!currentOrder || !isEditable) return
    run(async () => {
      const voided = await posAction(locationId, {
        action: 'void',
        orderId: currentOrder.id,
      })
      toast.success(t('voidedToast'))
      showOrder(voided)
      await refreshToday(voided.id)
    })
  }

  const handleRefund = () => {
    if (!currentOrder || !canRefund) return
    run(async () => {
      const refunded = await posAction(locationId, {
        action: 'refund',
        orderId: currentOrder.id,
      })
      toast.success(t('refundedToast'))
      setRefundConfirmOpen(false)
      showOrder(refunded)
      await refreshToday(refunded.id)
    })
  }

  const handleNewTicket = () => {
    run(async () => {
      const order = await posAction(locationId, { action: 'open' })
      showOrder(order)
      await refreshToday(order.id)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedCategoryId === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategoryId('all')}
          >
            {t('allCategories')}
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={selectedCategoryId === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('emptyMenu')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={pending}
                onClick={() => handleAddItem(item)}
                className={cn(
                  'flex min-h-24 flex-col items-start justify-between rounded-lg border bg-background p-3 text-left transition-colors',
                  'hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:opacity-50',
                )}
              >
                <span className="text-sm font-medium leading-snug">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(item.price, currencyCode)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="flex min-w-0 flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{t('currentTicket')}</h2>
            {currentOrder ? (
              <p className="text-xs text-muted-foreground">
                {currentOrder.billNumber}
                {currentOrder.status !== 'OPEN'
                  ? ` · ${t(`status.${currentOrder.status.toLowerCase()}`)}`
                  : null}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('noOpenTicket')}</p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={handleNewTicket}
          >
            {t('newTicket')}
          </Button>
        </div>

        {currentOrder && isEditable ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('tableLabel')}</span>
            <Input
              type="text"
              maxLength={64}
              value={tableLabelInput}
              onChange={(e) => setTableLabelInput(e.target.value)}
              disabled={pending}
              placeholder={t('tableLabelPlaceholder')}
              aria-label={t('tableLabel')}
              className="h-8 max-w-[10rem]"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={pending}
              onClick={handleApplyTableLabel}
            >
              {t('applyTableLabel')}
            </Button>
            {currentOrder.tableLabel ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                disabled={pending}
                onClick={handleClearTableLabel}
              >
                {t('clearTableLabel')}
              </Button>
            ) : null}
          </div>
        ) : currentOrder?.tableLabel ? (
          <p className="text-xs text-muted-foreground">
            {t('tableLabelReadOnly', { label: currentOrder.tableLabel })}
          </p>
        ) : null}

        {currentOrder && currentOrder.status !== 'OPEN' ? (
          <p className="text-xs text-muted-foreground">{t('readOnlyHint')}</p>
        ) : null}

        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {(currentOrder?.lines ?? []).map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{line.nameSnapshot}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(line.unitPrice, currencyCode)}
                  {!isEditable ? ` × ${line.qty}` : null}
                </p>
              </div>
              {isEditable ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={pending || line.qty <= 1}
                    onClick={() => handleUpdateQty(line.id, line.qty - 1)}
                    aria-label={t('decreaseQty')}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">{line.qty}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={pending}
                    onClick={() => handleUpdateQty(line.id, line.qty + 1)}
                    aria-label={t('increaseQty')}
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => handleRemoveLine(line.id)}
                  >
                    {t('remove')}
                  </Button>
                </div>
              ) : (
                <span className="shrink-0 text-sm tabular-nums">
                  {formatCurrency(line.lineTotal, currencyCode)}
                </span>
              )}
            </li>
          ))}
          {!currentOrder?.lines?.length ? (
            <li className="py-6 text-center text-sm text-muted-foreground">{t('emptyCart')}</li>
          ) : null}
        </ul>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <span>{t('subtotal')}</span>
            <span className="tabular-nums">{formatCurrency(subtotal, currencyCode)}</span>
          </div>
          {isEditable ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="shrink-0">{t('discount')}</span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="flex rounded-md border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={discountMode === 'amount' ? 'secondary' : 'ghost'}
                      className="h-7 px-2 text-xs"
                      disabled={!currentOrder || pending}
                      onClick={() => handleDiscountModeChange('amount')}
                    >
                      {t('discountAmount')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={discountMode === 'percent' ? 'secondary' : 'ghost'}
                      className="h-7 px-2 text-xs"
                      disabled={!currentOrder || pending}
                      onClick={() => handleDiscountModeChange('percent')}
                    >
                      {t('discountPercent')}
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={discountMode === 'percent' ? 100 : undefined}
                    step={discountMode === 'percent' ? '0.1' : '0.01'}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    disabled={!currentOrder || pending}
                    aria-label={t('discount')}
                    className="h-9 w-24 text-right tabular-nums"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!currentOrder || pending}
                    onClick={handleApplyDiscount}
                  >
                    {t('applyDiscount')}
                  </Button>
                </div>
              </div>
              {discountMode === 'percent' && percentPreviewAmount != null ? (
                <p className="text-right text-xs text-muted-foreground">
                  {t('discountPercentHint', {
                    amount: formatCurrency(percentPreviewAmount, currencyCode),
                  })}
                </p>
              ) : null}
            </div>
          ) : discount > 0 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('discount')}</span>
              <span className="tabular-nums">−{formatCurrency(discount, currencyCode)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-base font-semibold">
            <span>{t('total')}</span>
            <span className="tabular-nums">{formatCurrency(total, currencyCode)}</span>
          </div>
        </div>

        {isEditable ? (
          <div className="flex flex-col gap-2">
            {!payOpen ? (
              <Button
                type="button"
                disabled={!currentOrder?.lines.length || pending}
                onClick={() => setPayOpen(true)}
              >
                {t('pay')}
              </Button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'CARD', 'OTHER'] as const).map((method) => (
                  <Button
                    key={method}
                    type="button"
                    disabled={pending}
                    onClick={() => handlePay(method)}
                  >
                    {t(`payment.${method.toLowerCase()}`)}
                  </Button>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" disabled={!currentOrder || pending} onClick={handleVoid}>
              {t('void')}
            </Button>
          </div>
        ) : canShowReceipt ? (
          <div className="flex flex-col gap-2">
            <Button type="button" disabled={pending} onClick={() => setReceiptOpen(true)}>
              {t('receipt')}
            </Button>
            {canRefund ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setRefundConfirmOpen(true)}
              >
                {t('refund')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="border-t pt-3">
          <h3 className="mb-2 text-sm font-semibold">{t('todayTitle')}</h3>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {TODAY_FILTERS.map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={todayFilter === filter ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => setTodayFilter(filter)}
              >
                {filter === 'all'
                  ? t('todayFilterAll')
                  : t(`status.${filter.toLowerCase()}`)}
              </Button>
            ))}
          </div>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
            {filteredTodayOrders.length === 0 ? (
              <li className="text-muted-foreground">
                {todayOrders.length === 0 ? t('todayEmpty') : t('todayFilterEmpty')}
              </li>
            ) : (
              filteredTodayOrders.map((order) => {
                const selected = currentOrder?.id === order.id
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSelectTicket(order)}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected && 'bg-muted',
                        'disabled:opacity-50',
                      )}
                    >
                      <span className="truncate font-medium">
                        {order.billNumber}
                        {order.tableLabel ? (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            · {order.tableLabel.length > 12
                              ? `${order.tableLabel.slice(0, 12)}…`
                              : order.tableLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {t(`status.${order.status.toLowerCase()}`)}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </aside>

      <Dialog open={receiptOpen && canShowReceipt} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md print:fixed print:inset-0 print:max-h-none print:max-w-none print:translate-x-0 print:translate-y-0 print:rounded-none print:border-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>{t('receiptTitle')}</DialogTitle>
          </DialogHeader>
          {currentOrder && canShowReceipt ? (
            <PosReceipt
              order={currentOrder}
              locationName={locationName}
              currencyCode={currencyCode}
            />
          ) : null}
          <DialogFooter className="print:hidden sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setReceiptOpen(false)}>
              {t('receiptClose')}
            </Button>
            <Button type="button" onClick={() => window.print()}>
              {t('receiptPrint')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('refundConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentOrder
                ? t('refundConfirmDescription', { bill: currentOrder.billNumber })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              {t('refundCancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !canRefund}
              onClick={handleRefund}
            >
              {t('refundConfirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .pos-receipt-print,
          .pos-receipt-print * {
            visibility: visible !important;
          }
          .pos-receipt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
