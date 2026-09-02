'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

import { FormSurface } from '../../_components/form-surface'
import {
  catalogFormFromItem,
  catalogFormValidationError,
  parseOptionalPrice,
  type CatalogForm,
} from './catalog-form'
import { CatalogFormFields } from './catalog-form-fields'

type Props = {
  item: InventoryCatalogItem
  onClose: () => void
  onSuccess: () => void
}

export function CatalogEditDialog({ item, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [form, setForm] = useState<CatalogForm>(() => catalogFormFromItem(item))
  const [pending, setPending] = useState(false)

  function patchForm(patch: Partial<CatalogForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  async function handleUpdate() {
    const error = catalogFormValidationError(form, t)
    if (error) {
      toast.error(error)
      return
    }
    const packageSize = Number(form.packageSize)
    const parsedPrice = parseOptionalPrice(form.price)
    if (!parsedPrice.ok) {
      toast.error(t('validation.priceMin'))
      return
    }

    setPending(true)
    try {
      const res = await fetch(`/api/inventory-catalog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          packageSize,
          packageUnit: form.packageUnit.trim(),
          storageZone: form.storageZone,
          price: parsedPrice.price,
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      onClose()
      toast.success(t('editPantryItem'))
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
      title={t('editPantryItem')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleUpdate()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t('save')}
          </Button>
        </>
      }
    >
      <CatalogFormFields
        value={form}
        onChange={patchForm}
        idPrefix="catalog-edit"
        disabled={pending}
      />
    </FormSurface>
  )
}
