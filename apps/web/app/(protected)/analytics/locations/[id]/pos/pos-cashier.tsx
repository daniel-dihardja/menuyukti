'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { cn } from '@workspace/ui/lib/utils'

import type { LocationMenu, LocationMenuItem } from '@/lib/graphql/queries/location-menu'
import type {
  PosOrder,
  PosPaymentMethod,
} from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

type PosCashierProps = {
  locationId: number
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
  const [payOpen, setPayOpen] = useState(false)

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

  const subtotal =
    currentOrder?.lines.reduce((sum, line) => sum + line.lineTotal, 0) ?? 0
  const discount = currentOrder?.discountAmount ?? 0
  const total = Math.max(0, subtotal - discount)

  const refreshToday = async () => {
    const res = await fetch(`/api/locations/${locationId}/pos`)
    const payload = (await res.json()) as { orders?: PosOrder[]; error?: string }
    if (res.ok && payload.orders) {
      setTodayOrders(payload.orders)
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
    setCurrentOrder(order)
    setDiscountInput(String(order.discountAmount ?? 0))
    return order
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
      setCurrentOrder(updated)
    })
  }

  const handleUpdateQty = (lineId: number, qty: number) => {
    if (qty < 1) return
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'updateLine',
        lineId,
        qty,
      })
      setCurrentOrder(updated)
    })
  }

  const handleRemoveLine = (lineId: number) => {
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'removeLine',
        lineId,
      })
      setCurrentOrder(updated)
    })
  }

  const handleApplyDiscount = () => {
    if (!currentOrder) return
    const amount = Number(discountInput)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error(t('errors.invalidDiscount'))
      return
    }
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'setDiscount',
        orderId: currentOrder.id,
        amount,
      })
      setCurrentOrder(updated)
      setDiscountInput(String(updated.discountAmount))
    })
  }

  const handlePay = (paymentMethod: PosPaymentMethod) => {
    if (!currentOrder) return
    run(async () => {
      const paid = await posAction(locationId, {
        action: 'close',
        orderId: currentOrder.id,
        paymentMethod,
      })
      toast.success(t('paidToast', { bill: paid.billNumber }))
      setCurrentOrder(null)
      setDiscountInput('0')
      setPayOpen(false)
      await refreshToday()
    })
  }

  const handleVoid = () => {
    if (!currentOrder) return
    run(async () => {
      await posAction(locationId, {
        action: 'void',
        orderId: currentOrder.id,
      })
      toast.success(t('voidedToast'))
      setCurrentOrder(null)
      setDiscountInput('0')
      await refreshToday()
    })
  }

  const handleNewTicket = () => {
    run(async () => {
      const order = await posAction(locationId, { action: 'open' })
      setCurrentOrder(order)
      setDiscountInput('0')
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
              <p className="text-xs text-muted-foreground">{currentOrder.billNumber}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('noOpenTicket')}</p>
            )}
          </div>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={handleNewTicket}>
            {t('newTicket')}
          </Button>
        </div>

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
                </p>
              </div>
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
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              disabled={!currentOrder || pending}
              aria-label={t('discount')}
              className="h-9"
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
          <div className="flex items-center justify-between text-base font-semibold">
            <span>{t('total')}</span>
            <span className="tabular-nums">{formatCurrency(total, currencyCode)}</span>
          </div>
        </div>

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
          <Button
            type="button"
            variant="outline"
            disabled={!currentOrder || currentOrder.status !== 'OPEN' || pending}
            onClick={handleVoid}
          >
            {t('void')}
          </Button>
        </div>

        <div className="border-t pt-3">
          <h3 className="mb-2 text-sm font-semibold">{t('todayTitle')}</h3>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
            {todayOrders.length === 0 ? (
              <li className="text-muted-foreground">{t('todayEmpty')}</li>
            ) : (
              todayOrders.map((order) => (
                <li key={order.id} className="flex justify-between gap-2">
                  <span className="truncate">{order.billNumber}</span>
                  <span className="shrink-0 text-muted-foreground">{order.status}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>
    </div>
  )
}
