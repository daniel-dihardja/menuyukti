'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import {
  MENU_ALLERGENS,
  MENU_DIETARY_TAGS,
  type MenuAllergen,
  type MenuDietaryTag,
} from '@/lib/menu/menu-attributes'
import { routes } from '@/lib/routes'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
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
  id?: number
  name: string
  price: string
  description: string
  isAvailable: boolean
  imageFilename: string | null
  dietaryTags: MenuDietaryTag[]
  allergens: MenuAllergen[]
  modifierGroups: LocationMenuFormModifierGroup[]
}

export type LocationMenuFormCategory = {
  key: string
  id?: number
  name: string
  items: LocationMenuFormItem[]
}

type Props = {
  locationId: number
  currencyCode: string
  initialCategories: LocationMenuFormCategory[]
  publicMenuEnabled: boolean
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
  id?: number
  name: string
  price: number
  description: string
  isAvailable: boolean
  imageFilename: string | null
  dietaryTags: MenuDietaryTag[]
  allergens: MenuAllergen[]
  modifierGroups: SavePayloadModifierGroup[]
}

type SavePayloadCategory = {
  id?: number
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
    isAvailable: true,
    imageFilename: null,
    dietaryTags: [],
    allergens: [],
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
    item.dietaryTags.length === 0 &&
    item.allergens.length === 0 &&
    item.modifierGroups.length === 0
  )
}

function AttributeChipGroup<T extends string>({
  label,
  options,
  selected,
  disabled,
  onChange,
  labelFor,
}: {
  label: string
  options: readonly T[]
  selected: readonly T[]
  disabled: boolean
  onChange: (next: T[]) => void
  labelFor: (value: T) => string
}) {
  return (
    <Field className="sm:col-span-2 gap-2">
      <FieldLabel>{label}</FieldLabel>
      <ToggleGroup
        type="multiple"
        value={[...selected]}
        onValueChange={(next) => onChange(next as T[])}
        disabled={disabled}
        aria-label={label}
        className="justify-start"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option} value={option} className="rounded-full px-3 text-xs">
            {labelFor(option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
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
  const priceLabel = item.price.trim()
  const summaryBadges = [
    ...item.dietaryTags.map((tag) => ({ key: `dietary-${tag}`, label: t(`dietary.${tag}`) })),
    ...item.allergens.map((tag) => ({ key: `allergen-${tag}`, label: t(`allergens.${tag}`) })),
  ].slice(0, 4)

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
      className="rounded-lg border border-border/70 bg-card"
    >
      <div className="flex items-center gap-2 p-3">
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
              data-icon="inline-start"
              className={cn(
                'shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
            <span className="min-w-0 flex-1 truncate">{displayName}</span>
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {priceLabel ? (
                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                  {currencyCode} {priceLabel}
                </span>
              ) : null}
              {!item.isAvailable ? (
                <Badge variant="secondary">{t('fields.unavailableBadge')}</Badge>
              ) : null}
              {!open
                ? summaryBadges.map((badge) => (
                    <Badge key={badge.key} variant="outline" className="font-normal">
                      {badge.label}
                    </Badge>
                  ))
                : null}
            </span>
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
          <Trash2 />
        </Button>
      </div>

      <CollapsibleContent className="flex flex-col gap-3 border-t border-border/60 px-3 pb-3 pt-3">
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
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>{currencyCode}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id={`menu-price-${item.key}`}
                inputMode="decimal"
                value={item.price}
                disabled={loading}
                onChange={(e) => onUpdate({ price: e.target.value })}
                placeholder={t('fields.pricePlaceholder')}
                className="tabular-nums"
              />
            </InputGroup>
          </Field>
          <Field
            orientation="horizontal"
            className="items-center justify-between gap-4 sm:col-span-2"
          >
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor={`menu-available-${item.key}`}>
                {t('fields.available')}
              </FieldLabel>
              <FieldDescription>{t('fields.availableHint')}</FieldDescription>
            </div>
            <Switch
              id={`menu-available-${item.key}`}
              checked={item.isAvailable}
              onCheckedChange={(checked) => onUpdate({ isAvailable: checked })}
              disabled={loading}
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
          <AttributeChipGroup
            label={t('fields.dietaryTags')}
            options={MENU_DIETARY_TAGS}
            selected={item.dietaryTags}
            disabled={loading}
            onChange={(next) => onUpdate({ dietaryTags: next })}
            labelFor={(value) => t(`dietary.${value}`)}
          />
          <AttributeChipGroup
            label={t('fields.allergens')}
            options={MENU_ALLERGENS}
            selected={item.allergens}
            disabled={loading}
            onChange={(next) => onUpdate({ allergens: next })}
            labelFor={(value) => t(`allergens.${value}`)}
          />
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
              <Plus data-icon="inline-start" />
              {t('actions.addModifierGroup')}
            </Button>
          </div>
          {item.modifierGroups.length === 0 ? (
            <FieldDescription>{t('fields.modifiersEmpty')}</FieldDescription>
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
                    <Trash2 />
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
                      <Field className="w-full sm:w-40">
                        <FieldLabel htmlFor={`mod-delta-${option.key}`}>
                          {t('fields.modifierPriceDelta', { currency: currencyCode })}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupAddon>
                            <InputGroupText>{currencyCode}</InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
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
                        </InputGroup>
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={loading}
                        onClick={() => removeOption(group.key, option.key)}
                        aria-label={t('actions.removeModifierOption')}
                      >
                        <Trash2 />
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
                    <Plus data-icon="inline-start" />
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

export function LocationMenuForm({
  locationId,
  currencyCode,
  initialCategories,
  publicMenuEnabled,
}: Props) {
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
            ...(typeof row.id === 'number' ? { id: row.id } : {}),
            name,
            price,
            description,
            isAvailable: row.isAvailable,
            imageFilename: row.imageFilename,
            dietaryTags: row.dietaryTags,
            allergens: row.allergens,
            modifierGroups,
          })
        }
        if (!categoryName && items.length === 0) continue
        if (!categoryName) {
          throw new Error(t('errors.categoryNameRequired'))
        }
        payload.push({
          ...(typeof category.id === 'number' ? { id: category.id } : {}),
          name: categoryName,
          items,
        })
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
      toast.success(t('toast.saved'))
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unknown')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <section className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <p className="text-sm text-muted-foreground">
          {t('currencyHint', { currency: currencyCode })}
        </p>
      </section>

      <Alert>
        <AlertTitle>
          {publicMenuEnabled ? t('serviceBanner.onTitle') : t('serviceBanner.offTitle')}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>{publicMenuEnabled ? t('serviceBanner.onHint') : t('serviceBanner.offHint')}</p>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link
              href={
                publicMenuEnabled
                  ? routes.servicesDigitalMenuLocation(locationId)
                  : routes.servicesDigitalMenu
              }
            >
              {publicMenuEnabled ? t('serviceBanner.manageCta') : t('serviceBanner.turnOnCta')}
            </Link>
          </Button>
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-6">
        {categories.map((category) => (
          <Card key={category.key} className="gap-4 py-4 hover:border-card-border">
            <CardHeader className="border-b pb-4">
              <Field className="min-w-0">
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
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={loading}
                  onClick={() => removeCategory(category.key)}
                  aria-label={t('actions.removeCategory')}
                >
                  <Trash2 />
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
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
            </CardContent>

            <CardFooter className="border-t pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => addItem(category.key)}
              >
                <Plus data-icon="inline-start" />
                {t('actions.add')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errors.saveFailed')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur-sm sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" disabled={loading} onClick={addCategory}>
          <Plus data-icon="inline-start" />
          {t('actions.addCategory')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Spinner data-icon="inline-start" /> : null}
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
