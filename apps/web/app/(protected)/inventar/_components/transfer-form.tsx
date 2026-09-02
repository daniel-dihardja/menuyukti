'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { Button } from '@workspace/ui/components/button'
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
import { Spinner } from '@workspace/ui/components/spinner'

import { formatPackLabel } from './format-pack'
import { FormSurface } from './form-surface'
import { StockBadge } from './stock-badge'
import {
  inventarErrorMessage,
  todayIsoDate,
  type InventarApiErrorPayload,
  type InventarBranch,
} from './stock-utils'

type Props = {
  row: InventoryStockRow
  destinations: InventarBranch[]
  initialDestinationId: string
  onClose: () => void
  onSuccess: () => void
}

export function TransferForm({
  row,
  destinations,
  initialDestinationId,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)
  const [transferDestinationId, setTransferDestinationId] = useState(initialDestinationId)
  const [transferQuantity, setTransferQuantity] = useState(String(row.onHand))

  const transferQtyAmount = Number(transferQuantity)
  const transferRemaining =
    Number.isFinite(transferQtyAmount) &&
    transferQtyAmount > 0 &&
    transferQtyAmount <= row.onHand
      ? row.onHand - transferQtyAmount
      : null

  async function handleTransferStock() {
    if (!transferDestinationId) {
      toast.error(t('validation.destinationRequired'))
      return
    }
    const quantity = Number(transferQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error(t('validation.quantityPositive'))
      return
    }
    if (quantity > row.onHand) {
      toast.error(t('validation.quantityTooMuch'))
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/inventory-stock?mode=transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStockId: row.id,
          toLocationId: Number(transferDestinationId),
          quantity,
          occurredOn: todayIsoDate(),
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
        throw new Error(inventarErrorMessage(payload, t))
      }
      onClose()
      toast.success(t('transferStock'))
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
      title={t('transferStock')}
      description={`${row.catalogItem.name} (${formatPackLabel(
        row.catalogItem.packageSize,
        row.catalogItem.packageUnit,
      )})`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleTransferStock()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t('transfer')}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel>{t('currentStock')}</FieldLabel>
          <StockBadge onHand={row.onHand} packagesLabel={t('packages')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="inventar-transfer-destination">{t('destinationLocation')}</FieldLabel>
          <Select value={transferDestinationId} onValueChange={setTransferDestinationId}>
            <SelectTrigger
              id="inventar-transfer-destination"
              className="min-h-11 touch-manipulation lg:min-h-9"
            >
              <SelectValue placeholder={t('destinationPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {destinations.map((branch) => (
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
    </FormSurface>
  )
}
