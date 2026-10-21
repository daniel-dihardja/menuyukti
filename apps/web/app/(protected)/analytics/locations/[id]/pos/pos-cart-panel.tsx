'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Separator } from '@workspace/ui/components/separator'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import type { PosOrder, PosPaymentMethod } from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

import type { DiscountMode } from './pos-utils'
import {
  isDigitalMenuOrder,
  linePreDiscountTotal,
  nextPrepStatus,
  statusBadgeVariant,
} from './pos-utils'

const AMOUNT_DISCOUNT_CHIPS = [1, 2, 5] as const
const PERCENT_DISCOUNT_CHIPS = [5, 10, 15] as const

type PosCartPanelProps = {
  currentOrder: PosOrder | null
  currencyCode: string
  busyKey: string | null
  isEditable: boolean
  canShowReceipt: boolean
  canShowKitchen: boolean
  canRefund: boolean
  subtotal: number
  discount: number
  total: number
  discountInput: string
  discountMode: DiscountMode
  percentPreviewAmount: number | null
  tableLabelInput: string
  payOpen: boolean
  editingNoteLineId: number | null
  editNoteDraft: string
  showHeaderActions?: boolean
  stickyActions?: boolean
  onTableLabelInputChange: (value: string) => void
  onDiscountInputChange: (value: string) => void
  onDiscountModeChange: (mode: DiscountMode) => void
  onEditNoteDraftChange: (value: string) => void
  onStartEditNote: (lineId: number, note: string | null) => void
  onCancelEditNote: () => void
  onNewTicket: () => void
  onApplyTableLabel: () => void
  onClearTableLabel: () => void
  onUpdateQty: (lineId: number, qty: number) => void
  onRemoveLine: (lineId: number) => void
  onSaveLineNote: (lineId: number) => void
  onApplyDiscount: () => void
  onQuickDiscount: (mode: DiscountMode, value: number) => void
  onPayOpen: () => void
  onPayCancel: () => void
  onPay: (method: PosPaymentMethod) => void
  onKitchen: () => void
  onVoid: () => void
  onReceipt: () => void
  onRefund: () => void
  onAdvancePrep?: () => void
  onOps?: () => void
}

export function PosCartPanel({
  currentOrder,
  currencyCode,
  busyKey,
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
  showHeaderActions = true,
  stickyActions = false,
  onTableLabelInputChange,
  onDiscountInputChange,
  onDiscountModeChange,
  onEditNoteDraftChange,
  onStartEditNote,
  onCancelEditNote,
  onNewTicket,
  onApplyTableLabel,
  onClearTableLabel,
  onUpdateQty,
  onRemoveLine,
  onSaveLineNote,
  onApplyDiscount,
  onQuickDiscount,
  onPayOpen,
  onPayCancel,
  onPay,
  onKitchen,
  onVoid,
  onReceipt,
  onRefund,
  onAdvancePrep,
  onOps,
}: PosCartPanelProps) {
  const t = useTranslations('pos')
  const lines = currentOrder?.lines ?? []
  const digitalMenu = currentOrder ? isDigitalMenuOrder(currentOrder) : false
  const prepNext =
    currentOrder && digitalMenu
      ? nextPrepStatus(currentOrder.prepStatus, currentOrder.fulfillmentMode)
      : null

  const isBusy = (key: string) => busyKey === key
  const lineBusy = (lineId: number) => busyKey === `line:${lineId}`
  const noteBusy = (lineId: number) => busyKey === `note:${lineId}`
  const payBusy = isBusy('pay')
  const discountBusy = isBusy('discount')
  const tableBusy = isBusy('table')
  const ticketBusy = isBusy('newTicket')
  const voidBusy = isBusy('void')
  const refundBusy = isBusy('refund')
  const prepBusy = isBusy('prep')
  const anyBusy = busyKey != null

  const actions = (
    <div className="flex flex-col gap-2">
      {prepNext && onAdvancePrep ? (
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={prepBusy}
          onClick={onAdvancePrep}
        >
          {prepBusy ? <Spinner data-icon="inline-start" /> : null}
          {t(`prep.advanceTo.${prepNext.toLowerCase()}`)}
        </Button>
      ) : null}
      {isEditable ? (
        <>
          {!payOpen ? (
            <Button
              type="button"
              size="lg"
              disabled={!currentOrder?.lines.length || payBusy}
              onClick={onPayOpen}
            >
              {payBusy ? <Spinner data-icon="inline-start" /> : null}
              {t('pay')}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'CARD', 'OTHER'] as const).map((method) => (
                  <Button
                    key={method}
                    type="button"
                    size="lg"
                    disabled={payBusy}
                    onClick={() => onPay(method)}
                  >
                    {payBusy ? <Spinner data-icon="inline-start" /> : null}
                    {t(`payment.${method.toLowerCase()}`)}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={payBusy}
                onClick={onPayCancel}
              >
                {t('payCancel')}
              </Button>
            </div>
          )}
          {canShowKitchen ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={anyBusy}
              onClick={onKitchen}
            >
              {t('kitchenPrint')}
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            variant="destructive"
            disabled={!currentOrder || voidBusy}
            onClick={onVoid}
          >
            {voidBusy ? <Spinner data-icon="inline-start" /> : null}
            {t('void')}
          </Button>
        </>
      ) : canShowReceipt || canShowKitchen ? (
        <>
          {canShowReceipt ? (
            <Button type="button" size="lg" disabled={anyBusy} onClick={onReceipt}>
              {t('receipt')}
            </Button>
          ) : null}
          {canShowKitchen ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={anyBusy}
              onClick={onKitchen}
            >
              {t('kitchenPrint')}
            </Button>
          ) : null}
          {canRefund ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={refundBusy}
              onClick={onRefund}
            >
              {refundBusy ? <Spinner data-icon="inline-start" /> : null}
              {t('refund')}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-col gap-3',
        stickyActions && 'h-full overflow-hidden',
      )}
      aria-busy={anyBusy}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{t('currentTicket')}</h2>
            {currentOrder && currentOrder.status !== 'OPEN' ? (
              <Badge variant={statusBadgeVariant(currentOrder.status)}>
                {t(`status.${currentOrder.status.toLowerCase()}`)}
              </Badge>
            ) : null}
            {digitalMenu && currentOrder?.prepStatus ? (
              <Badge variant="outline">
                {t(`prep.status.${currentOrder.prepStatus.toLowerCase()}`)}
              </Badge>
            ) : null}
          </div>
          {currentOrder ? (
            <p className="truncate text-xs text-muted-foreground">
              {currentOrder.billNumber}
              {currentOrder.fulfillmentMode === 'PICKUP'
                ? ` · ${t('fulfillmentPickup')}`
                : currentOrder.fulfillmentMode === 'DELIVERY'
                  ? ` · ${t('fulfillmentDelivery')}`
                  : null}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('noOpenTicket')}</p>
          )}
        </div>
        {showHeaderActions ? (
          <div className="flex shrink-0 items-center gap-2">
            {onOps ? (
              <Button type="button" size="lg" variant="outline" onClick={onOps}>
                {t('opsSheetTrigger')}
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={ticketBusy}
              onClick={onNewTicket}
            >
              {ticketBusy ? <Spinner data-icon="inline-start" /> : null}
              {t('newTicket')}
            </Button>
          </div>
        ) : null}
      </div>

      {currentOrder?.fulfillmentMode === 'DELIVERY' &&
      (currentOrder.deliveryAddress || currentOrder.deliveryPhone) ? (
        <div className="shrink-0 space-y-1 text-xs text-muted-foreground">
          {currentOrder.deliveryAddress ? (
            <p className="whitespace-pre-wrap">{currentOrder.deliveryAddress}</p>
          ) : null}
          {currentOrder.deliveryPhone ? (
            <p>
              {t('deliveryPhone')}: {currentOrder.deliveryPhone}
            </p>
          ) : null}
          {currentOrder.deliveryNotes ? (
            <p className="whitespace-pre-wrap">
              {t('deliveryNotes')}: {currentOrder.deliveryNotes}
            </p>
          ) : null}
        </div>
      ) : currentOrder && isEditable ? (
        <FieldGroup className="shrink-0 gap-3">
          <Field orientation="horizontal" className="flex-wrap items-end gap-2">
            <FieldLabel htmlFor="pos-table-label">{t('tableLabel')}</FieldLabel>
            <Input
              id="pos-table-label"
              type="text"
              maxLength={64}
              value={tableLabelInput}
              onChange={(e) => onTableLabelInputChange(e.target.value)}
              onBlur={() => {
                const next = tableLabelInput.trim()
                const current = (currentOrder.tableLabel ?? '').trim()
                if (next !== current) onApplyTableLabel()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onApplyTableLabel()
                }
              }}
              disabled={tableBusy}
              placeholder={t('tableLabelPlaceholder')}
              className="h-11 max-w-[10rem]"
            />
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={tableBusy}
              onClick={onApplyTableLabel}
            >
              {tableBusy ? <Spinner data-icon="inline-start" /> : null}
              {t('applyTableLabel')}
            </Button>
            {currentOrder.tableLabel ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                disabled={tableBusy}
                onClick={onClearTableLabel}
              >
                {t('clearTableLabel')}
              </Button>
            ) : null}
          </Field>
        </FieldGroup>
      ) : currentOrder?.tableLabel ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          {t('tableLabelReadOnly', { label: currentOrder.tableLabel })}
        </p>
      ) : null}

      {currentOrder && currentOrder.status !== 'OPEN' ? (
        <p className="shrink-0 text-xs text-muted-foreground">{t('readOnlyHint')}</p>
      ) : null}

      <ScrollArea className={cn('min-h-0', stickyActions ? 'flex-1 overflow-hidden' : 'max-h-72')}>
        {lines.length === 0 ? (
          <Empty className="border-0 p-4 md:p-6">
            <EmptyHeader>
              <EmptyTitle className="text-base">{t('emptyCartTitle')}</EmptyTitle>
              <EmptyDescription>{t('emptyCart')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2 pr-3">
            {lines.map((line) => {
              const thisLineBusy = lineBusy(line.id)
              const thisNoteBusy = noteBusy(line.id)
              return (
                <li key={line.id} className="flex flex-col gap-1 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.nameSnapshot}</p>
                      {(line.modifiers ?? []).length > 0 ? (
                        <ul className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {(line.modifiers ?? []).map((modifier) => (
                            <li key={modifier.id}>+ {modifier.nameSnapshot}</li>
                          ))}
                        </ul>
                      ) : null}
                      {line.note && editingNoteLineId !== line.id ? (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          {t('lineNote')}: {line.note}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(line.unitPrice, currencyCode)}
                        {!isEditable ? ` × ${line.qty}` : null}
                      </p>
                    </div>
                    {isEditable ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-lg"
                          variant="outline"
                          disabled={thisLineBusy || line.qty <= 1}
                          onClick={() => onUpdateQty(line.id, line.qty - 1)}
                          aria-label={t('decreaseQty')}
                        >
                          −
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">{line.qty}</span>
                        <Button
                          type="button"
                          size="icon-lg"
                          variant="outline"
                          disabled={thisLineBusy}
                          onClick={() => onUpdateQty(line.id, line.qty + 1)}
                          aria-label={t('increaseQty')}
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          size="lg"
                          variant="ghost"
                          disabled={thisLineBusy}
                          onClick={() => onRemoveLine(line.id)}
                        >
                          {t('remove')}
                        </Button>
                      </div>
                    ) : (
                      <span className="shrink-0 text-sm tabular-nums">
                        {formatCurrency(linePreDiscountTotal(line), currencyCode)}
                      </span>
                    )}
                  </div>
                  {isEditable ? (
                    editingNoteLineId === line.id ? (
                      <FieldGroup className="gap-2">
                        <Field>
                          <FieldLabel htmlFor={`pos-line-note-${line.id}`}>
                            {t('lineNote')}
                          </FieldLabel>
                          <Textarea
                            id={`pos-line-note-${line.id}`}
                            value={editNoteDraft}
                            onChange={(e) => onEditNoteDraftChange(e.target.value)}
                            disabled={thisNoteBusy}
                            rows={2}
                            placeholder={t('lineNotePlaceholder')}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="lg"
                            disabled={thisNoteBusy}
                            onClick={() => onSaveLineNote(line.id)}
                          >
                            {thisNoteBusy ? <Spinner data-icon="inline-start" /> : null}
                            {t('saveLineNote')}
                          </Button>
                          <Button
                            type="button"
                            size="lg"
                            variant="ghost"
                            disabled={thisNoteBusy}
                            onClick={onCancelEditNote}
                          >
                            {t('cancelLineNote')}
                          </Button>
                        </div>
                      </FieldGroup>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        variant="ghost"
                        className="self-start px-3"
                        disabled={thisNoteBusy}
                        onClick={() => onStartEditNote(line.id, line.note)}
                      >
                        {line.note ? t('editLineNote') : t('addLineNote')}
                      </Button>
                    )
                  ) : null}
                  <Separator />
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>

      <div
        className={cn(
          'flex flex-col gap-2',
          stickyActions &&
            'shrink-0 border-t bg-background pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="flex items-center justify-between text-sm">
          <span>{t('subtotal')}</span>
          <span className="tabular-nums">{formatCurrency(subtotal, currencyCode)}</span>
        </div>
        {isEditable ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="shrink-0">{t('discount')}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={discountMode}
                  onValueChange={(value) => {
                    if (value === 'amount' || value === 'percent') onDiscountModeChange(value)
                  }}
                  className="gap-1"
                >
                  <ToggleGroupItem
                    value="amount"
                    disabled={!currentOrder || discountBusy}
                    className="min-h-11 px-3"
                  >
                    {t('discountAmount')}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="percent"
                    disabled={!currentOrder || discountBusy}
                    className="min-h-11 px-3"
                  >
                    {t('discountPercent')}
                  </ToggleGroupItem>
                </ToggleGroup>
                <Input
                  type="number"
                  min={0}
                  max={discountMode === 'percent' ? 100 : undefined}
                  step={discountMode === 'percent' ? '0.1' : '0.01'}
                  value={discountInput}
                  onChange={(e) => onDiscountInputChange(e.target.value)}
                  disabled={!currentOrder || discountBusy}
                  aria-label={t('discount')}
                  className="h-11 w-24 text-right tabular-nums"
                />
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={!currentOrder || discountBusy}
                  onClick={onApplyDiscount}
                >
                  {discountBusy ? <Spinner data-icon="inline-start" /> : null}
                  {t('applyDiscount')}
                </Button>
              </div>
            </div>
            {currentOrder ? (
              <div className="flex flex-wrap gap-2">
                {(discountMode === 'percent' ? PERCENT_DISCOUNT_CHIPS : AMOUNT_DISCOUNT_CHIPS).map(
                  (value) => (
                    <Button
                      key={`${discountMode}-${value}`}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="min-h-9"
                      disabled={discountBusy}
                      onClick={() => onQuickDiscount(discountMode, value)}
                    >
                      {discountMode === 'percent'
                        ? t('discountChipPercent', { value })
                        : t('discountChipAmount', {
                            amount: formatCurrency(value, currencyCode),
                          })}
                    </Button>
                  ),
                )}
              </div>
            ) : null}
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
        {actions}
      </div>
    </div>
  )
}
