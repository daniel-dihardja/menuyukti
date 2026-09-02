'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

import { FormSurface } from '../../_components/form-surface'
import {
  catalogFormValidationError,
  emptyCatalogForm,
  parseOptionalPrice,
  type CatalogForm,
} from './catalog-form'
import { CatalogFormFields } from './catalog-form-fields'

type Props = {
  workspaceId: number
  onClose: () => void
  onSuccess: () => void
}

export function CatalogAddDialog({ workspaceId, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [form, setForm] = useState<CatalogForm>(emptyCatalogForm)
  const [pending, setPending] = useState(false)

  function patchForm(patch: Partial<CatalogForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  async function handleCreate() {
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
      const res = await fetch('/api/inventory-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
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
      toast.success(t('addPantryItem'))
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
      title={t('addPantryItem')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleCreate()}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {t('save')}
          </Button>
        </>
      }
    >
      <CatalogFormFields
        value={form}
        onChange={patchForm}
        idPrefix="catalog-add"
        disabled={pending}
      />
    </FormSurface>
  )
}
