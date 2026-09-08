'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'

import { formatPackLabel } from './format-pack'
import { FormSurface } from './form-surface'
import { StockBadge } from './stock-badge'
import { inventarErrorMessage, todayIsoDate, type InventarApiErrorPayload } from './stock-utils'

const UNASSIGNED_AREA = '__unassigned__'
const LAST_AREA_STORAGE_PREFIX = 'inventar:lastArea:'

type AreaOption = { id: number; name: string; sortOrder: number }

type Props = {
  row: InventoryStockRow
  locationId: number
  areas: AreaOption[]
  onClose: () => void
  onSuccess: () => void
}

function readLastAreaId(locationId: number): number | null {
  try {
    const raw = window.localStorage.getItem(`${LAST_AREA_STORAGE_PREFIX}${locationId}`)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

function writeLastAreaId(locationId: number, areaId: number | null) {
  try {
    const key = `${LAST_AREA_STORAGE_PREFIX}${locationId}`
    if (areaId == null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, String(areaId))
    }
  } catch {
    // ignore storage failures
  }
}

function initialAreaValue(locationId: number, areas: AreaOption[]): string {
  if (areas.length === 0) return UNASSIGNED_AREA
  const last = readLastAreaId(locationId)
  if (last != null && areas.some((area) => area.id === last)) {
    return String(last)
  }
  return UNASSIGNED_AREA
}

export function UseForm({ row, locationId, areas, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)
  const [useQty, setUseQty] = useState('1')
  const [useDate, setUseDate] = useState(todayIsoDate)
  const [areaValue, setAreaValue] = useState(() => initialAreaValue(locationId, areas))

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
    const areaId = areaValue === UNASSIGNED_AREA || areas.length === 0 ? null : Number(areaValue)
    if (areaId != null && (!Number.isInteger(areaId) || areaId < 1)) {
      toast.error(t('validation.areaInvalid'))
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
        body: JSON.stringify({
          quantity,
          occurredOn: useDate,
          areaId,
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
        throw new Error(inventarErrorMessage(payload, t))
      }
      writeLastAreaId(locationId, areaId)
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
          <StockBadge
            onHand={row.onHand}
            packagesLabel={t('packages')}
            minOnHand={row.minOnHand}
            maxOnHand={row.maxOnHand}
          />
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
        {areas.length > 0 ? (
          <Field>
            <FieldLabel>{t('area')}</FieldLabel>
            <Select value={areaValue} onValueChange={setAreaValue} disabled={pending}>
              <SelectTrigger className="min-h-11 touch-manipulation lg:min-h-9">
                <SelectValue placeholder={t('areaUnassigned')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_AREA}>{t('areaUnassigned')}</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={String(area.id)}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
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
