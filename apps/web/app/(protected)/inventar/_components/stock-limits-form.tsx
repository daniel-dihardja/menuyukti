'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'

import { parseOptionalOnHandLimit } from '../catalog/_components/catalog-form'
import { FormSurface } from './form-surface'
import { inventarErrorMessage, type InventarApiErrorPayload } from './stock-utils'

type Props = {
  row: InventoryStockRow
  locationId: number
  onClose: () => void
  onSuccess: () => void
}

export function StockLimitsForm({ row, locationId, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)
  const [minOnHand, setMinOnHand] = useState(row.minOnHand != null ? String(row.minOnHand) : '')
  const [maxOnHand, setMaxOnHand] = useState(row.maxOnHand != null ? String(row.maxOnHand) : '')

  async function handleSave() {
    const parsedMin = parseOptionalOnHandLimit(minOnHand)
    if (!parsedMin.ok) {
      toast.error(t('validation.minOnHandMin'))
      return
    }
    const parsedMax = parseOptionalOnHandLimit(maxOnHand)
    if (!parsedMax.ok) {
      toast.error(t('validation.maxOnHandMin'))
      return
    }
    if (
      parsedMin.value != null &&
      parsedMax.value != null &&
      parsedMin.value > parsedMax.value
    ) {
      toast.error(t('validation.minMaxOrder'))
      return
    }

    setPending(true)
    try {
      const res = await fetch(
        `/api/inventory-stock/${row.id}/limits?locationId=${locationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            minOnHand: parsedMin.value,
            maxOnHand: parsedMax.value,
          }),
        },
      )
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
        throw new Error(inventarErrorMessage(payload, t))
      }
      onClose()
      toast.success(t('editLimits'))
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneric'))
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
      title={t('editLimits')}
      description={row.catalogItem.name}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleSave()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t('save')}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="stock-limits-min">{t('minOnHand')}</FieldLabel>
            <Input
              id="stock-limits-min"
              inputMode="decimal"
              value={minOnHand}
              disabled={pending}
              placeholder={t('onHandLimitOptional')}
              onChange={(e) => setMinOnHand(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="stock-limits-max">{t('maxOnHand')}</FieldLabel>
            <Input
              id="stock-limits-max"
              inputMode="decimal"
              value={maxOnHand}
              disabled={pending}
              placeholder={t('onHandLimitOptional')}
              onChange={(e) => setMaxOnHand(e.target.value)}
            />
          </Field>
        </div>
      </FieldGroup>
    </FormSurface>
  )
}
