import { createLoader } from 'nuqs/server'
import { parseAsStringLiteral } from 'nuqs/server'

export const SHOP_COLLECTION_VALUES = [
  'all',
  'posters',
  'menu-backgrounds',
  'custom-prints',
  'limited-edition',
  'digital-downloads',
] as const

export type ShopCollectionParam = (typeof SHOP_COLLECTION_VALUES)[number]

export const SHOP_SORT_VALUES = ['newest', 'popularity'] as const

export type ShopSortParam = (typeof SHOP_SORT_VALUES)[number]

export const loadShopListParams = createLoader({
  collection: parseAsStringLiteral(SHOP_COLLECTION_VALUES).withDefault('all'),
  sort: parseAsStringLiteral(SHOP_SORT_VALUES).withDefault('newest'),
})
