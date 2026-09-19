'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

export type LocationMenuFormModifierOption = {
  key: string
  name: string
  priceDelta: string
}

export type LocationMenuFormModifierGroup = {
  key: string
  name: string
  minSelect: string
  maxSelect: string
  options: LocationMenuFormModifierOption[]
}

export type LocationMenuFormItem = {
  key: string
  name: string
  price: string
  description: string
  imageFilename: string | null
  modifierGroups: LocationMenuFormModifierGroup[]
}

export type LocationMenuFormCategory = {
  key: string
  name: string
  items: LocationMenuFormItem[]
}

type Props = {
  locationId: number
  currencyCode: string
  initialCategories: LocationMenuFormCategory[]
}

type SavePayloadModifierOption = {
  name: string
  priceDelta: number
  isAvailable: true
}

type SavePayloadModifierGroup = {
  name: string
  minSelect: number
  maxSelect: number
  options: SavePayloadModifierOption[]
}

type SavePayloadItem = {
  name: string
  price: number
  description: string
  isAvailable: true
  imageFilename: string | null
  modifierGroups: SavePayloadModifierGroup[]
}

type SavePayloadCategory = {
  name: string
  items: SavePayloadItem[]
}

function newModifierOption(): LocationMenuFormModifierOption {
  return {
    key: `opt-${crypto.randomUUID()}`,
    name: '',
    priceDelta: '0',
  }
}

function newModifierGroup(): LocationMenuFormModifierGroup {
  return {
    key: `grp-${crypto.randomUUID()}`,
    name: '',
    minSelect: '0',
    maxSelect: '1',
    options: [newModifierOption()],
  }
}

function newItem(): LocationMenuFormItem {
  return {
    key: `item-${crypto.randomUUID()}`,
    name: '',
    price: '',
    description: '',
    imageFilename: null,
    modifierGroups: [],
  }
}

function newCategory(): LocationMenuFormCategory {
  return {
    key: `cat-${crypto.randomUUID()}`,
    name: '',
    items: [newItem()],
  }
}

function isBlankItem(item: LocationMenuFormItem): boolean {
  return (
    !item.name &&
    !item.price &&
    !item.description &&
    !item.imageFilename &&
    item.modifierGroups.length === 0
  )
}

type MenuItemRowProps = {
  item: LocationMenuFormItem
  currencyCode: string
  loading: boolean
  defaultOpen: boolean
  onUpdate: (patch: Partial<LocationMenuFormItem>) => void
  onRemove: () => void
}

function LocationMenuItemRow({
  item,
  currencyCode,
  loading,
  defaultOpen,
  onUpdate,
  onRemove,
}: MenuItemRowProps) {
  const t = useTranslations('analytics.locationMenu')
  const [open, setOpen] = useState(defaultOpen)
  const displayName = item.name.trim() || t('untitledItem')

  function updateGroup(groupKey: string, patch: Partial<LocationMenuFormModifierGroup>) {
    onUpdate({
      modifierGroups: item.modifierGroups.map((group) =>
        group.key === groupKey ? { ...group, ...patch } : group,
      ),
    })
  }

  function updateOption(
    groupKey: string,
    optionKey: string,
    patch: Partial<LocationMenuFormModifierOption>,
  ) {
    onUpdate({
      modifierGroups: item.modifierGroups.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              options: group.options.map((option) =>
                option.key === optionKey ? { ...option, ...patch } : option,
              ),
            }
          : group,
      ),
    })
  }

  function addGroup() {
    onUpdate({ modifierGroups: [...item.modifierGroups, newModifierGroup()] })
  }

  function removeGroup(groupKey: string) {
    onUpdate({
      modifierGroups: item.modifierGroups.filter((group) => group.key !== groupKey),
    })
  }

  function addOption(groupKey: string) {
    onUpdate({
      modifierGroups: item.modifierGroups.map((group) =>
        group.key === groupKey
          ? { ...group, options: [...group.options, newModifierOption()] }
          : group,
      ),
    })
  }

  function removeOption(groupKey: string, optionKey: string) {
    onUpdate({
      modifierGroups: item.modifierGroups.map((group) => {
        if (group.key !== groupKey) return group
        const nextOptions = group.options.filter((option) => option.key !== optionKey)
        return {
          ...group,
          options: nextOptions.length > 0 ? nextOptions : [newModifierOption()],
        }
      }),
    })
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border border-border/70 p-3"
    >
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left font-medium"
            aria-label={open ? t('actions.collapseItem') : t('actions.expandItem')}
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
            <span className="truncate">{displayName}</span>
          </Button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={loading}
          onClick={onRemove}
          aria-label={t('actions.remove')}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <CollapsibleContent className="flex flex-col gap-3 pt-3">
        <FieldGroup className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`menu-name-${item.key}`}>{t('fields.name')}</FieldLabel>
            <Input
              id={`menu-name-${item.key}`}
              value={item.name}
              disabled={loading}
              onChange={(e) => onUpdate({ name: e.target.value })}
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
              onChange={(e) => onUpdate({ price: e.target.value })}
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
              onChange={(e) => onUpdate({ description: e.target.value })}
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
              onSelect={(media: MediaCatalogItem) => onUpdate({ imageFilename: media.name })}
              onClear={() => onUpdate({ imageFilename: null })}
              disabled={loading}
              pickLabel={t('fields.pickImage')}
              pickerAriaLabel={t('fields.pickerAria')}
              emptyLabel={t('fields.emptyMedia')}
              removeLabel={t('fields.removeImage')}
              fromMediaLabel={t('fields.fromMedia')}
            />
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-3 rounded-md border border-dashed border-border/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t('fields.modifiers')}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={addGroup}
            >
              <Plus className="size-4" />
              {t('actions.addModifierGroup')}
            </Button>
          </div>
          {item.modifierGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('fields.modifiersEmpty')}</p>
          ) : (
            item.modifierGroups.map((group) => (
              <div
                key={group.key}
                className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/20 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor={`mod-group-${group.key}`}>
                      {t('fields.modifierGroupName')}
                    </FieldLabel>
                    <Input
                      id={`mod-group-${group.key}`}
                      value={group.name}
                      disabled={loading}
                      onChange={(e) => updateGroup(group.key, { name: e.target.value })}
                      placeholder={t('fields.modifierGroupNamePlaceholder')}
                    />
                  </Field>
                  <Field className="w-full sm:w-24">
                    <FieldLabel htmlFor={`mod-min-${group.key}`}>
                      {t('fields.modifierMinSelect')}
                    </FieldLabel>
                    <Input
                      id={`mod-min-${group.key}`}
                      inputMode="numeric"
                      value={group.minSelect}
                      disabled={loading}
                      onChange={(e) => updateGroup(group.key, { minSelect: e.target.value })}
                      className="tabular-nums"
                    />
                  </Field>
                  <Field className="w-full sm:w-24">
                    <FieldLabel htmlFor={`mod-max-${group.key}`}>
                      {t('fields.modifierMaxSelect')}
                    </FieldLabel>
                    <Input
                      id={`mod-max-${group.key}`}
                      inputMode="numeric"
                      value={group.maxSelect}
                      disabled={loading}
                      onChange={(e) => updateGroup(group.key, { maxSelect: e.target.value })}
                      className="tabular-nums"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={loading}
                    onClick={() => removeGroup(group.key)}
                    aria-label={t('actions.removeModifierGroup')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {group.options.map((option) => (
                    <div key={option.key} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Field className="min-w-0 flex-1">
                        <FieldLabel htmlFor={`mod-opt-${option.key}`}>
                          {t('fields.modifierOptionName')}
                        </FieldLabel>
                        <Input
                          id={`mod-opt-${option.key}`}
                          value={option.name}
                          disabled={loading}
                          onChange={(e) =>
                            updateOption(group.key, option.key, { name: e.target.value })
                          }
                          placeholder={t('fields.modifierOptionNamePlaceholder')}
                        />
                      </Field>
                      <Field className="w-full sm:w-32">
                        <FieldLabel htmlFor={`mod-delta-${option.key}`}>
                          {t('fields.modifierPriceDelta', { currency: currencyCode })}
                        </FieldLabel>
                        <Input
                          id={`mod-delta-${option.key}`}
                          inputMode="decimal"
                          value={option.priceDelta}
                          disabled={loading}
                          onChange={(e) =>
                            updateOption(group.key, option.key, {
                              priceDelta: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="tabular-nums"
                        />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={loading}
                        onClick={() => removeOption(group.key, option.key)}
                        aria-label={t('actions.removeModifierOption')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => addOption(group.key)}
                  >
                    <Plus className="size-4" />
                    {t('actions.addModifierOption')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function LocationMenuForm({ locationId, currencyCode, initialCategories }: Props) {
  const router = useRouter()
  const t = useTranslations('analytics.locationMenu')
  const [categories, setCategories] = useState<LocationMenuFormCategory[]>(() =>
    initialCategories.length > 0 ? initialCategories : [newCategory()],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateCategory(key: string, patch: Partial<Pick<LocationMenuFormCategory, 'name'>>) {
    setCategories((prev) => prev.map((cat) => (cat.key === key ? { ...cat, ...patch } : cat)))
  }

  function updateItem(categoryKey: string, itemKey: string, patch: Partial<LocationMenuFormItem>) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.key === categoryKey
          ? {
              ...cat,
              items: cat.items.map((row) => (row.key === itemKey ? { ...row, ...patch } : row)),
            }
          : cat,
      ),
    )
  }

  function addCategory() {
    setCategories((prev) => [...prev, newCategory()])
  }

  function removeCategory(key: string) {
    setCategories((prev) => {
      const next = prev.filter((cat) => cat.key !== key)
      return next.length > 0 ? next : [newCategory()]
    })
  }

  function addItem(categoryKey: string) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.key === categoryKey ? { ...cat, items: [...cat.items, newItem()] } : cat,
      ),
    )
  }

  function removeItem(categoryKey: string, itemKey: string) {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== categoryKey) return cat
        const nextItems = cat.items.filter((row) => row.key !== itemKey)
        return { ...cat, items: nextItems.length > 0 ? nextItems : [newItem()] }
      }),
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: SavePayloadCategory[] = []
      for (const category of categories) {
        const categoryName = category.name.trim()
        const items: SavePayloadItem[] = []
        for (const row of category.items) {
          const name = row.name.trim()
          const priceRaw = row.price.trim()
          const description = row.description.trim()
          const hasImage = Boolean(row.imageFilename)
          const hasModifiers = row.modifierGroups.some(
            (group) =>
              group.name.trim() ||
              group.options.some((option) => option.name.trim() || option.priceDelta.trim()),
          )
          if (!name && !priceRaw && !description && !hasImage && !hasModifiers) continue
          const price = Number(priceRaw)
          if (!name) {
            throw new Error(t('errors.nameRequired'))
          }
          if (!Number.isFinite(price) || price < 0) {
            throw new Error(t('errors.invalidPrice'))
          }

          const modifierGroups: SavePayloadModifierGroup[] = []
          for (const group of row.modifierGroups) {
            const groupName = group.name.trim()
            const options: SavePayloadModifierOption[] = []
            for (const option of group.options) {
              const optionName = option.name.trim()
              const deltaRaw = option.priceDelta.trim() || '0'
              if (!optionName && !deltaRaw) continue
              if (!optionName) {
                throw new Error(t('errors.modifierOptionNameRequired'))
              }
              const priceDelta = Number(deltaRaw)
              if (!Number.isFinite(priceDelta)) {
                throw new Error(t('errors.invalidModifierPriceDelta'))
              }
              options.push({ name: optionName, priceDelta, isAvailable: true })
            }
            if (!groupName && options.length === 0) continue
            if (!groupName) {
              throw new Error(t('errors.modifierGroupNameRequired'))
            }
            if (options.length === 0) {
              throw new Error(t('errors.modifierOptionsRequired'))
            }
            const minSelect = Number(group.minSelect)
            const maxSelect = Number(group.maxSelect)
            if (!Number.isInteger(minSelect) || minSelect < 0) {
              throw new Error(t('errors.invalidModifierSelect'))
            }
            if (!Number.isInteger(maxSelect) || maxSelect < 1 || minSelect > maxSelect) {
              throw new Error(t('errors.invalidModifierSelect'))
            }
            modifierGroups.push({ name: groupName, minSelect, maxSelect, options })
          }

          items.push({
            name,
            price,
            description,
            isAvailable: true,
            imageFilename: row.imageFilename,
            modifierGroups,
          })
        }
        if (!categoryName && items.length === 0) continue
        if (!categoryName) {
          throw new Error(t('errors.categoryNameRequired'))
        }
        payload.push({ name: categoryName, items })
      }

      const res = await fetch(`/api/locations/${locationId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: payload }),
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

      <div className="flex flex-col gap-6">
        {categories.map((category) => (
          <section
            key={category.key}
            className="flex flex-col gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Field className="min-w-0 flex-1">
                <FieldLabel htmlFor={`menu-category-${category.key}`}>
                  {t('fields.categoryName')}
                </FieldLabel>
                <Input
                  id={`menu-category-${category.key}`}
                  value={category.name}
                  disabled={loading}
                  onChange={(e) => updateCategory(category.key, { name: e.target.value })}
                  placeholder={t('fields.categoryNamePlaceholder')}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={loading}
                onClick={() => removeCategory(category.key)}
                aria-label={t('actions.removeCategory')}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {category.items.map((item) => (
                <LocationMenuItemRow
                  key={item.key}
                  item={item}
                  currencyCode={currencyCode}
                  loading={loading}
                  defaultOpen={isBlankItem(item)}
                  onUpdate={(patch) => updateItem(category.key, item.key, patch)}
                  onRemove={() => removeItem(category.key, item.key)}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => addItem(category.key)}
              >
                <Plus className="size-4" />
                {t('actions.add')}
              </Button>
            </div>
          </section>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" disabled={loading} onClick={addCategory}>
          <Plus className="size-4" />
          {t('actions.addCategory')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
