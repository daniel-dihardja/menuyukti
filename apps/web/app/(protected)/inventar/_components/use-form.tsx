'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'

import { formatPackLabel } from './format-pack'
import { FormSurface } from './form-surface'
import { StockBadge } from './stock-badge'
import {
  inventarErrorMessage,
  todayIsoDate,
  type InventarApiErrorPayload,
} from './stock-utils'

type Props = {
  row: InventoryStockRow
  locationId: number
  onClose: () => void
  onSuccess: () => void
}

export function UseForm({ row, locationId, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)
  const [useQty, setUseQty] = useState('1')
  const [useDate, setUseDate] = useState(todayIsoDate)

  const useQtyAmount = Number(useQty)
  const useNewStock =
    Number.isFinite(useQtyAmount) && useQtyAmount >= 0 && useQtyAmount <= row.onHand
      ? row.onHand - useQtyAmount
      : null

  async function handleUseStock() {
    const quantity = Number(useQty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error(t('validation.quantityPositive'))
      return
    }
    if (quantity > row.onHand) {
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
        locationId: String(locationId),
        catalogItemId: String(row.catalogItemId),
      })
      const res = await fetch(`/api/inventory-stock/${row.id}?${params}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, occurredOn: useDate }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
        throw new Error(inventarErrorMessage(payload, t))
      }
      onClose()
      toast.success(t('useStock'))
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  return (
    <FormSurface
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t('useStock')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleUseStock()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t('use')}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          {row.catalogItem.name} (
          {formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)})
        </p>
        <Field>
          <FieldLabel>{t('currentStock')}</FieldLabel>
          <StockBadge onHand={row.onHand} packagesLabel={t('packages')} />
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
          <FieldLabel>{t('usedOn')}</FieldLabel>
          <DatePicker
            value={useDate}
            onChange={setUseDate}
            disabled={pending}
            placeholder={t('datePlaceholder')}
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
    </FormSurface>
  )
}
