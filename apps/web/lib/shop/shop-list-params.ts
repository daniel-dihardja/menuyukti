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
