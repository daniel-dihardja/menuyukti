'use client'

import { useTranslations } from 'next-intl'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

import {
  SHOP_COLLECTION_VALUES,
  SHOP_SORT_VALUES,
  type ShopCollectionParam,
  type ShopSortParam,
} from '@/lib/shop/shop-list-params'

const collectionParser = parseAsStringLiteral(SHOP_COLLECTION_VALUES).withDefault('all')
const sortParser = parseAsStringLiteral(SHOP_SORT_VALUES).withDefault('newest')

function collectionLabel(t: (key: string) => string, id: ShopCollectionParam): string {
  switch (id) {
    case 'all':
      return t('collections.all')
    case 'posters':
      return t('collections.posters')
    case 'menu-backgrounds':
      return t('collections.menuBackgrounds')
    case 'custom-prints':
      return t('collections.customPrints')
    case 'limited-edition':
      return t('collections.limitedEdition')
    case 'digital-downloads':
      return t('collections.digitalDownloads')
    default:
      return t('collections.all')
  }
}

function sortLabel(t: (key: string) => string, id: ShopSortParam): string {
  switch (id) {
    case 'newest':
      return t('sort.newest')
    case 'popularity':
      return t('sort.popularity')
    default:
      return t('sort.newest')
  }
}

export function ShopFilterBar() {
  const t = useTranslations('shop')
  const [collection, setCollection] = useQueryState('collection', collectionParser)
  const [sort, setSort] = useQueryState('sort', sortParser)

  return (
    <section className="mb-16 min-w-0">
      <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-card/40 px-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8 md:px-6">
        <ToggleGroup
          type="single"
          value={collection ?? 'all'}
          onValueChange={(v) => {
            void setCollection((v || 'all') as ShopCollectionParam)
          }}
          aria-label={t('filterAria')}
          className="min-w-0 flex-1"
        >
          {SHOP_COLLECTION_VALUES.map((id) => (
            <ToggleGroupItem
              key={id}
              value={id}
              className="min-h-10 px-3.5 py-2.5 sm:min-h-9 sm:px-3 sm:py-2"
            >
              {collectionLabel(t, id)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator className="md:hidden" />

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 md:w-auto md:shrink-0">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('sort.label')}
          </span>
          <Select
            value={sort ?? 'newest'}
            onValueChange={(v) => {
              void setSort(v as ShopSortParam)
            }}
          >
            <SelectTrigger aria-label={t('sort.label')} className="w-full md:w-[min(100%,220px)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SHOP_SORT_VALUES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {sortLabel(t, opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  )
}
