'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'

export type LocationMenuFormItem = {
  key: string
  name: string
  price: string
  description: string
  imageFilename: string | null
}

type Props = {
  locationId: number
  currencyCode: string
  initialItems: LocationMenuFormItem[]
}

type SavePayloadItem = {
  name: string
  price: number
  description: string
  isAvailable: true
  imageFilename: string | null
}

function newRow(): LocationMenuFormItem {
  return {
    key: `new-${crypto.randomUUID()}`,
    name: '',
    price: '',
    description: '',
    imageFilename: null,
  }
}

export function LocationMenuForm({ locationId, currencyCode, initialItems }: Props) {
  const router = useRouter()
  const t = useTranslations('analytics.locationMenu')
  const [items, setItems] = useState<LocationMenuFormItem[]>(() =>
    initialItems.length > 0 ? initialItems : [newRow()],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateItem(key: string, patch: Partial<LocationMenuFormItem>) {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addItem() {
    setItems((prev) => [...prev, newRow()])
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const next = prev.filter((row) => row.key !== key)
      return next.length > 0 ? next : [newRow()]
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = items
        .map((row) => {
          const name = row.name.trim()
          const priceRaw = row.price.trim()
          const description = row.description.trim()
          const hasImage = Boolean(row.imageFilename)
          if (!name && !priceRaw && !description && !hasImage) return null
          const price = Number(priceRaw)
          if (!name) {
            throw new Error(t('errors.nameRequired'))
          }
          if (!Number.isFinite(price) || price < 0) {
            throw new Error(t('errors.invalidPrice'))
          }
          return {
            name,
            price,
            description,
            isAvailable: true,
            imageFilename: row.imageFilename,
          } satisfies SavePayloadItem
        })
        .filter((row): row is SavePayloadItem => Boolean(row))

      const res = await fetch(`/api/locations/${locationId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message || t('errors.saveFailed'))
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <p className="text-sm text-muted-foreground">
          {t('currencyHint', { currency: currencyCode })}
        </p>
      </section>

      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div
            key={item.key}
            className="flex flex-col gap-3 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('itemLabel', { number: index + 1 })}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={loading}
                onClick={() => removeItem(item.key)}
                aria-label={t('actions.remove')}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <FieldGroup className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`menu-name-${item.key}`}>{t('fields.name')}</FieldLabel>
                <Input
                  id={`menu-name-${item.key}`}
                  value={item.name}
                  disabled={loading}
                  onChange={(e) => updateItem(item.key, { name: e.target.value })}
                  placeholder={t('fields.namePlaceholder')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`menu-price-${item.key}`}>
                  {t('fields.priceWithCurrency', { currency: currencyCode })}
                </FieldLabel>
                <Input
                  id={`menu-price-${item.key}`}
                  inputMode="decimal"
                  value={item.price}
                  disabled={loading}
                  onChange={(e) => updateItem(item.key, { price: e.target.value })}
                  placeholder={t('fields.pricePlaceholder')}
                  className="tabular-nums"
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={`menu-desc-${item.key}`}>{t('fields.description')}</FieldLabel>
                <Textarea
                  id={`menu-desc-${item.key}`}
                  value={item.description}
                  disabled={loading}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  placeholder={t('fields.descriptionPlaceholder')}
                  rows={2}
                />
              </Field>
              <Field className="sm:col-span-2 gap-1.5">
                <FieldLabel>{t('fields.image')}</FieldLabel>
                <MediaCatalogPicker
                  selectedImage={
                    item.imageFilename
                      ? {
                          name: item.imageFilename,
                          url: mediaDownloadHref(item.imageFilename),
                        }
                      : null
                  }
                  onSelect={(media: MediaCatalogItem) =>
                    updateItem(item.key, { imageFilename: media.name })
                  }
                  onClear={() => updateItem(item.key, { imageFilename: null })}
                  disabled={loading}
                  pickLabel={t('fields.pickImage')}
                  pickerAriaLabel={t('fields.pickerAria')}
                  emptyLabel={t('fields.emptyMedia')}
                  removeLabel={t('fields.removeImage')}
                  fromMediaLabel={t('fields.fromMedia')}
                />
              </Field>
            </FieldGroup>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" disabled={loading} onClick={addItem}>
          <Plus className="size-4" />
          {t('actions.add')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
