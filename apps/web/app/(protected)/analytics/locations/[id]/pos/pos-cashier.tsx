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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Spinner } from '@workspace/ui/components/spinner'

import type {
  LocationMenu,
  LocationMenuItem,
  LocationMenuModifierGroup,
} from '@/lib/graphql/queries/location-menu'
import type { PosDaySummary, PosOrder, PosPaymentMethod } from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

import { PosCartPanel } from './pos-cart-panel'
import { PosCollapseSidebar } from './pos-collapse-sidebar'
import { PosCustomizeDialog } from './pos-customize-dialog'
import { PosKitchenTicket } from './pos-kitchen-ticket'
import { PosMenuGrid } from './pos-menu-grid'
import { PosOpsSheet } from './pos-ops-sheet'
import { PosReceipt } from './pos-receipt'
import {
  availableModifierGroups,
  type DiscountMode,
  roundMoney,
  todayIsoDate,
  type TodayFilter,
} from './pos-utils'

type PosCashierProps = {
  locationId: number
  locationName: string
  currencyCode: string
  initialMenu: LocationMenu | null
  initialOrders: PosOrder[]
}

async function posAction(locationId: number, body: Record<string, unknown>): Promise<PosOrder> {
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

async function fetchDaySummary(locationId: number, onDate: string): Promise<PosDaySummary | null> {
  const params = new URLSearchParams({ daySummary: '1', onDate })
  const res = await fetch(`/api/locations/${locationId}/pos?${params.toString()}`)
  const payload = (await res.json()) as { summary?: PosDaySummary | null; error?: string }
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to load day summary')
  }
  return payload.summary ?? null
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
  const [kitchenOpen, setKitchenOpen] = useState(false)
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [opsSheetOpen, setOpsSheetOpen] = useState(false)
  const [customizeItem, setCustomizeItem] = useState<LocationMenuItem | null>(null)
  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<number, number[]>>({})
  const [lineNoteDraft, setLineNoteDraft] = useState('')
  const [editingNoteLineId, setEditingNoteLineId] = useState<number | null>(null)
  const [editNoteDraft, setEditNoteDraft] = useState('')
  const [dayCloseDate, setDayCloseDate] = useState(todayIsoDate)
  const [daySummary, setDaySummary] = useState<PosDaySummary | null>(null)

  const isEditable = currentOrder?.status === 'OPEN'
  const canShowReceipt =
    currentOrder != null && (currentOrder.status === 'PAID' || currentOrder.status === 'REFUNDED')
  const canShowKitchen =
    currentOrder != null &&
    (currentOrder.status === 'OPEN' ||
      currentOrder.status === 'PAID' ||
      currentOrder.status === 'REFUNDED') &&
    (currentOrder.lines?.length ?? 0) > 0
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
  const lineCount = currentOrder?.lines?.length ?? 0
  const discountInputValue = Number(discountInput)
  const percentPreviewAmount =
    discountMode === 'percent' &&
    Number.isFinite(discountInputValue) &&
    discountInputValue >= 0 &&
    discountInputValue <= 100
      ? roundMoney((subtotal * discountInputValue) / 100)
      : null

  const customizeGroups = customizeItem ? availableModifierGroups(customizeItem) : []

  const showOrder = (order: PosOrder | null) => {
    setCurrentOrder(order)
    setDiscountMode('amount')
    setDiscountInput(String(order?.discountAmount ?? 0))
    setTableLabelInput(order?.tableLabel ?? '')
    setPayOpen(false)
    setEditingNoteLineId(null)
    setEditNoteDraft('')
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

  const openCustomizeDialog = (item: LocationMenuItem) => {
    const groups = availableModifierGroups(item)
    const initial: Record<number, number[]> = {}
    for (const group of groups) {
      initial[group.id] = []
    }
    setCustomizeItem(item)
    setSelectedOptionIds(initial)
    setLineNoteDraft('')
  }

  const handleAddItem = (item: LocationMenuItem, forceDialog = false) => {
    const groups = availableModifierGroups(item)
    if (groups.length > 0 || forceDialog) {
      openCustomizeDialog(item)
      return
    }
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

  const toggleOption = (group: LocationMenuModifierGroup, optionId: number) => {
    setSelectedOptionIds((prev) => {
      const current = prev[group.id] ?? []
      const isSelected = current.includes(optionId)
      if (group.maxSelect <= 1) {
        return { ...prev, [group.id]: isSelected ? [] : [optionId] }
      }
      if (isSelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) }
      }
      if (current.length >= group.maxSelect) {
        toast.error(t('errors.modifierMax', { max: group.maxSelect, group: group.name }))
        return prev
      }
      return { ...prev, [group.id]: [...current, optionId] }
    })
  }

  const validateCustomizeSelection = (): number[] | null => {
    if (!customizeItem) return null
    const ids: number[] = []
    for (const group of customizeGroups) {
      const selected = selectedOptionIds[group.id] ?? []
      if (selected.length < group.minSelect) {
        toast.error(t('errors.modifierMin', { min: group.minSelect, group: group.name }))
        return null
      }
      if (selected.length > group.maxSelect) {
        toast.error(t('errors.modifierMax', { max: group.maxSelect, group: group.name }))
        return null
      }
      ids.push(...selected)
    }
    return ids
  }

  const handleConfirmCustomize = () => {
    if (!customizeItem) return
    const optionIds = validateCustomizeSelection()
    if (optionIds === null) return
    const note = lineNoteDraft.trim()
    const itemId = customizeItem.id
    setCustomizeItem(null)
    run(async () => {
      const order = await ensureOpenOrder()
      const updated = await posAction(locationId, {
        action: 'addLine',
        orderId: order.id,
        menuItemId: itemId,
        qty: 1,
        modifierOptionIds: optionIds,
        note: note || null,
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

  const handleSaveLineNote = (lineId: number) => {
    if (!isEditable) return
    const note = editNoteDraft.trim()
    run(async () => {
      const updated = await posAction(locationId, {
        action: 'setLineNote',
        lineId,
        note: note || null,
      })
      setEditingNoteLineId(null)
      setEditNoteDraft('')
      showOrder(updated)
      await refreshToday(updated.id)
    })
  }

  const handleApplyDiscount = () => {
    if (!currentOrder || !isEditable) return
    const raw = Number(discountInput)
    if (!Number.isFinite(raw) || raw < 0) {
      toast.error(
        discountMode === 'percent'
          ? t('errors.invalidDiscountPercent')
          : t('errors.invalidDiscount'),
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
      setCartSheetOpen(false)
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
      setVoidConfirmOpen(false)
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

  const handleLoadDaySummary = () => {
    run(async () => {
      const summary = await fetchDaySummary(locationId, dayCloseDate)
      setDaySummary(summary)
    })
  }

  const cartPanelProps = {
    currentOrder,
    currencyCode,
    pending,
    isEditable,
    canShowReceipt,
    canShowKitchen,
    canRefund,
    subtotal,
    discount,
    total,
    discountInput,
    discountMode,
    percentPreviewAmount,
    tableLabelInput,
    payOpen,
    editingNoteLineId,
    editNoteDraft,
    onTableLabelInputChange: setTableLabelInput,
    onDiscountInputChange: setDiscountInput,
    onDiscountModeChange: handleDiscountModeChange,
    onEditNoteDraftChange: setEditNoteDraft,
    onStartEditNote: (lineId: number, note: string | null) => {
      setEditingNoteLineId(lineId)
      setEditNoteDraft(note ?? '')
    },
    onCancelEditNote: () => {
      setEditingNoteLineId(null)
      setEditNoteDraft('')
    },
    onNewTicket: handleNewTicket,
    onApplyTableLabel: handleApplyTableLabel,
    onClearTableLabel: handleClearTableLabel,
    onUpdateQty: handleUpdateQty,
    onRemoveLine: handleRemoveLine,
    onSaveLineNote: handleSaveLineNote,
    onApplyDiscount: handleApplyDiscount,
    onPayOpen: () => setPayOpen(true),
    onPayCancel: () => setPayOpen(false),
    onPay: handlePay,
    // Close cart sheet first so Dialog/AlertDialog (z-50) is not trapped under Sheet.
    onKitchen: () => {
      setCartSheetOpen(false)
      setKitchenOpen(true)
    },
    onVoid: () => {
      setCartSheetOpen(false)
      setVoidConfirmOpen(true)
    },
    onReceipt: () => {
      setCartSheetOpen(false)
      setReceiptOpen(true)
    },
    onRefund: () => {
      setCartSheetOpen(false)
      setRefundConfirmOpen(true)
    },
    onOps: () => setOpsSheetOpen(true),
  } as const

  return (
    <>
      <PosCollapseSidebar />
      {/* Fill viewport below the shell header (h-16); keep ticket actions pinned. */}
      <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:overflow-hidden">
        <div className="grid min-h-0 gap-4 pb-24 lg:h-full lg:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.9fr)] lg:gap-4 lg:overflow-hidden lg:pb-0">
          <PosMenuGrid
            categories={categories}
            filteredItems={filteredItems}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            currencyCode={currencyCode}
            pending={pending}
            onAddItem={handleAddItem}
          />

          <aside className="hidden min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background p-4 lg:flex lg:h-full">
            <PosCartPanel {...cartPanelProps} stickyActions />
          </aside>
        </div>
      </div>

      {/* Mobile sticky checkout strip */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {isEditable && payOpen ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'CARD', 'OTHER'] as const).map((method) => (
                  <Button
                    key={method}
                    type="button"
                    size="lg"
                    disabled={pending || !lineCount}
                    onClick={() => handlePay(method)}
                  >
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    {t(`payment.${method.toLowerCase()}`)}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={pending}
                onClick={() => setPayOpen(false)}
              >
                {t('payCancel')}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="min-w-0 flex-1"
                onClick={() => setCartSheetOpen(true)}
              >
                {t('cartSheetTrigger', {
                  count: lineCount,
                  total: formatCurrency(total, currencyCode),
                })}
              </Button>
              {isEditable ? (
                <Button
                  type="button"
                  size="lg"
                  className="shrink-0"
                  disabled={!lineCount || pending}
                  onClick={() => setPayOpen(true)}
                >
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  {t('pay')}
                </Button>
              ) : canShowReceipt ? (
                <Button
                  type="button"
                  size="lg"
                  className="shrink-0"
                  disabled={pending}
                  onClick={() => {
                    setCartSheetOpen(false)
                    setReceiptOpen(true)
                  }}
                >
                  {t('receipt')}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className="shrink-0"
                  disabled={pending}
                  onClick={handleNewTicket}
                >
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  {t('newTicket')}
                </Button>
              )}
              {canShowKitchen ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="shrink-0"
                  disabled={pending}
                  onClick={() => {
                    setCartSheetOpen(false)
                    setKitchenOpen(true)
                  }}
                >
                  {t('kitchenPrintShort')}
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="shrink-0"
                onClick={() => setOpsSheetOpen(true)}
              >
                {t('opsSheetTrigger')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="flex max-h-[90dvh] flex-col gap-0 sm:max-w-none">
          <SheetHeader>
            <SheetTitle>{t('cartSheetTitle')}</SheetTitle>
            <SheetDescription>{t('cartSheetDescription')}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            <PosCartPanel {...cartPanelProps} showHeaderActions stickyActions={false} />
          </div>
        </SheetContent>
      </Sheet>

      <PosOpsSheet
        open={opsSheetOpen}
        onOpenChange={setOpsSheetOpen}
        todayOrders={todayOrders}
        filteredTodayOrders={filteredTodayOrders}
        todayFilter={todayFilter}
        onTodayFilterChange={setTodayFilter}
        currentOrderId={currentOrder?.id ?? null}
        pending={pending}
        currencyCode={currencyCode}
        dayCloseDate={dayCloseDate}
        daySummary={daySummary}
        onDayCloseDateChange={setDayCloseDate}
        onLoadDaySummary={handleLoadDaySummary}
        onSelectTicket={showOrder}
      />

      <PosCustomizeDialog
        item={customizeItem}
        groups={customizeGroups}
        selectedOptionIds={selectedOptionIds}
        lineNoteDraft={lineNoteDraft}
        currencyCode={currencyCode}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setCustomizeItem(null)
        }}
        onToggleOption={toggleOption}
        onLineNoteChange={setLineNoteDraft}
        onConfirm={handleConfirmCustomize}
      />

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

      <Dialog open={kitchenOpen && canShowKitchen} onOpenChange={setKitchenOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md print:fixed print:inset-0 print:max-h-none print:max-w-none print:translate-x-0 print:translate-y-0 print:rounded-none print:border-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>{t('kitchenTitle')}</DialogTitle>
          </DialogHeader>
          {currentOrder && canShowKitchen ? (
            <PosKitchenTicket order={currentOrder} locationName={locationName} />
          ) : null}
          <DialogFooter className="print:hidden sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setKitchenOpen(false)}>
              {t('kitchenClose')}
            </Button>
            <Button type="button" onClick={() => window.print()}>
              {t('kitchenPrintAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('voidConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentOrder ? t('voidConfirmDescription', { bill: currentOrder.billNumber }) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              {t('voidCancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !isEditable}
              onClick={handleVoid}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t('voidConfirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {pending ? <Spinner data-icon="inline-start" /> : null}
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
          .pos-receipt-print *,
          .pos-kitchen-print,
          .pos-kitchen-print * {
            visibility: visible !important;
          }
          .pos-receipt-print,
          .pos-kitchen-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1rem !important;
          }
        }
      `}</style>
    </>
  )
}
