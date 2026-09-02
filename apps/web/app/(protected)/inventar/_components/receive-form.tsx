'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { routes } from '@/lib/routes'
import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'

import { FormSurface } from './form-surface'
import { PantryItemCombobox } from './pantry-item-combobox'
import {
  inventarErrorMessage,
  todayIsoDate,
  type InventarApiErrorPayload,
  type InventarCatalogOption,
} from './stock-utils'

type Props = {
  isDesktop: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: number
  catalogItems: InventarCatalogOption[]
  stockRows: InventoryStockRow[]
  initialCatalogId: string
  onSuccess: () => void
}

export function ReceiveForm({
  isDesktop,
  open,
  onOpenChange,
  locationId,
  catalogItems,
  stockRows,
  initialCatalogId,
  onSuccess,
}: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState(initialCatalogId)
  const [receiveQty, setReceiveQty] = useState('1')
  const [receiveDate, setReceiveDate] = useState(todayIsoDate)

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

  async function handleBookDelivery() {
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
          locationId,
          catalogItemId,
          quantity,
          occurredOn: receiveDate,
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
        throw new Error(inventarErrorMessage(payload, t))
      }
      onOpenChange(false)
      toast.success(t('bookDeliverySuccess'))
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  return (
    <FormSurface
      isDesktop={isDesktop}
      open={open}
      onOpenChange={onOpenChange}
      title={t('bookDeliveryTitle')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleBookDelivery()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t('bookDelivery')}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel>{t('selectPantryItem')}</FieldLabel>
          <PantryItemCombobox
            items={sortedCatalogItems}
            value={selectedCatalogId}
            onValueChange={setSelectedCatalogId}
            placeholder={t('selectPantryItemPlaceholder')}
            searchPlaceholder={t('searchPantryItem')}
            emptyLabel={t('noPantryItemMatches')}
          />
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
            onClick={() => onOpenChange(false)}
          >
            {t('addPantryItem')}
          </Link>
        </p>
      </FieldGroup>
    </FormSurface>
  )
}
