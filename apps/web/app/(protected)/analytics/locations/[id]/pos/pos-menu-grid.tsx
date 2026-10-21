'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { SearchIcon, XIcon } from 'lucide-react'

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import type { LocationMenuCategory, LocationMenuItem } from '@/lib/graphql/queries/location-menu'
import { formatCurrency } from '@/lib/currency'

import { availableModifierGroups } from './pos-utils'
import { usePosShowItemImages } from './use-pos-show-item-images'

type MenuItemWithCategory = LocationMenuItem & { categoryName: string }

type PosMenuGridProps = {
  categories: LocationMenuCategory[]
  filteredItems: MenuItemWithCategory[]
  selectedCategoryId: number | 'all'
  onCategoryChange: (id: number | 'all') => void
  currencyCode: string
  /** When set, only this menu item id is busy for add (others stay tappable). */
  busyItemId?: number | null
  itemImageUrls: Record<string, string>
  onAddItem: (item: LocationMenuItem, forceDialog?: boolean) => void
  openTicketStrip?: ReactNode
}

export function PosMenuGrid({
  categories,
  filteredItems,
  selectedCategoryId,
  onCategoryChange,
  currencyCode,
  busyItemId = null,
  itemImageUrls,
  onAddItem,
  openTicketStrip,
}: PosMenuGridProps) {
  const t = useTranslations('pos')
  const { showItemImages, setShowItemImages } = usePosShowItemImages()
  const [searchQuery, setSearchQuery] = useState('')
  const toggleValue = selectedCategoryId === 'all' ? 'all' : String(selectedCategoryId)

  const searchNormalized = searchQuery.trim().toLowerCase()
  const visibleItems = !searchNormalized
    ? filteredItems
    : filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchNormalized) ||
          item.categoryName.toLowerCase().includes(searchNormalized),
      )

  return (
    <section className="flex min-h-0 min-w-0 flex-col gap-3 md:h-full md:overflow-hidden md:gap-4">
      {openTicketStrip}

      <div className="flex shrink-0 flex-col gap-3">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('menuSearchPlaceholder')}
            aria-label={t('menuSearchAria')}
            className="h-11 pr-10 pl-9"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setSearchQuery('')}
              aria-label={t('menuSearchClear')}
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
            <ToggleGroup
              type="single"
              value={toggleValue}
              onValueChange={(value) => {
                if (!value) return
                onCategoryChange(value === 'all' ? 'all' : Number(value))
              }}
              className="flex w-max flex-nowrap gap-2"
              aria-label={t('allCategories')}
            >
              <ToggleGroupItem value="all" className="min-h-11 snap-start px-4">
                {t('allCategories')}
              </ToggleGroupItem>
              {categories.map((category) => (
                <ToggleGroupItem
                  key={category.id}
                  value={String(category.id)}
                  className="min-h-11 snap-start px-4"
                >
                  {category.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <Field orientation="horizontal" className="w-auto shrink-0 items-center gap-2">
            <FieldLabel htmlFor="pos-show-item-images" className="text-sm font-normal">
              {t('showItemImages')}
            </FieldLabel>
            <Switch
              id="pos-show-item-images"
              size="sm"
              checked={showItemImages}
              onCheckedChange={setShowItemImages}
            />
          </Field>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <Empty className="border border-dashed p-6 md:p-8">
          <EmptyHeader>
            <EmptyTitle>
              {searchNormalized ? t('menuSearchEmptyTitle') : t('emptyMenuTitle')}
            </EmptyTitle>
            <EmptyDescription>
              {searchNormalized ? t('menuSearchEmpty') : t('emptyMenu')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => {
              const hasModifiers = availableModifierGroups(item).length > 0
              const imageFilename = item.imageFilename?.trim() || null
              const imageUrl = imageFilename ? (itemImageUrls[imageFilename] ?? null) : null
              const itemBusy = busyItemId === item.id
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex min-h-24 flex-col overflow-hidden rounded-lg border bg-background text-left',
                    'focus-within:ring-2 focus-within:ring-ring',
                    itemBusy && 'opacity-70',
                  )}
                >
                  <button
                    type="button"
                    disabled={itemBusy}
                    onClick={() => onAddItem(item)}
                    className={cn(
                      'flex min-h-20 flex-1 flex-col items-stretch text-left transition-colors',
                      'hover:bg-muted/40 focus-visible:outline-none',
                      'disabled:opacity-50',
                    )}
                  >
                    {showItemImages ? (
                      <div className="bg-muted aspect-[4/3] w-full overflow-hidden">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- short-lived S3 presigned URLs
                          <img
                            src={imageUrl}
                            alt={t('itemImageAlt', { name: item.name })}
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </div>
                    ) : null}
                    <span className="flex flex-1 flex-col items-start justify-between gap-2 p-3">
                      <span className="text-sm font-medium leading-snug">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.price, currencyCode)}
                        {hasModifiers ? (
                          <span className="ml-1 text-xs">{t('hasModifiers')}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  {!hasModifiers ? (
                    <button
                      type="button"
                      disabled={itemBusy}
                      onClick={() => onAddItem(item, true)}
                      className="min-h-11 border-t px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                    >
                      {t('addWithNote')}
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
