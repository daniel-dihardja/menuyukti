import type { ShopCollectionParam, ShopSortParam } from '@/lib/shop/shop-list-params'
import { parsePriceToNumber } from '@/lib/shop/format-usd'

export type ShopProductImageHint = {
  alt: string
  label: string
}

export type ShopSizeVariant = {
  id: string
  label: string
  price: string
}

export type ShopFinishVariant = {
  id: string
  label: string
}

export type ShopProductGridLayout = {
  colClass: string
  imageAspect: string
  titleClass: string
  addToCartClass: string
}

/** Collection tag for filtering (excludes virtual `all`). */
export type ShopProductCollectionId =
  | 'posters'
  | 'menu-backgrounds'
  | 'custom-prints'
  | 'limited-edition'

export type ShopProduct = {
  slug: string
  title: string
  subtitle: string
  /** Price shown on the shop grid (matches hero SKU). */
  displayPrice: string
  /** Alt/label hints merged with S3 images by index (see `resolveShopImages`). */
  imageHints: ShopProductImageHint[]
  description: string
  sizes: ShopSizeVariant[]
  finishes: ShopFinishVariant[]
  grid: ShopProductGridLayout
  collectionId: ShopProductCollectionId
  /** Lower = newer for default catalog order. */
  newestOrder: number
  /** Higher = more popular when sorting by popularity. */
  popularityOrder: number
}

const FINISHES_PRINT: ShopFinishVariant[] = [
  { id: 'matte', label: 'Fine art matte' },
  { id: 'semi-gloss', label: 'Semi-gloss photo' },
  { id: 'canvas', label: 'Gallery canvas' },
]

const FINISHES_DIGITAL: ShopFinishVariant[] = [
  { id: 'rgb', label: 'sRGB (web & screens)' },
  { id: 'cmyk', label: 'CMYK (print-ready)' },
]

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    slug: 'rustic-farm-to-table-poster',
    title: 'Rustic Farm-to-Table Poster',
    subtitle: `Series: Organic Origins | 24x36"`,
    displayPrice: '$185.00',
    description:
      'A warm, editorial photograph celebrating seasonal produce and honest plating—ideal for dining rooms, open kitchens, and farm-to-table concepts. Printed on archival paper with rich color fidelity and a soft matte surface that minimizes glare under restaurant lighting.',
    imageHints: [
      {
        alt: 'Full artwork: rustic farm-to-table vegetable arrangement',
        label: 'Full artwork',
      },
      {
        alt: 'Detail: texture and color on the poster surface',
        label: 'Paper detail',
      },
      {
        alt: 'Lifestyle: artwork in a bright dining space',
        label: 'In-room preview',
      },
    ],
    sizes: [
      { id: '12x18', label: `12 × 18"`, price: '$95.00' },
      { id: '18x24', label: `18 × 24"`, price: '$145.00' },
      { id: '24x36', label: `24 × 36"`, price: '$185.00' },
      { id: '30x40', label: `30 × 40"`, price: '$240.00' },
    ],
    finishes: FINISHES_PRINT,
    collectionId: 'posters',
    newestOrder: 0,
    popularityOrder: 5,
    grid: {
      colClass: 'col-span-12 md:col-span-8',
      imageAspect: 'aspect-[16/9]',
      titleClass: 'text-2xl',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'minimalist-slate-menu-background',
    title: 'Minimalist Slate Menu Background',
    subtitle: 'Digital Asset Bundle',
    displayPrice: '$45.00',
    description:
      'A versatile slate-toned backdrop pack for menus, specials boards, and social posts. Includes layered files and high-resolution exports so your brand team can drop in typography fast. Licensed for use across your restaurant group’s digital and print touchpoints.',
    imageHints: [
      {
        alt: 'Minimalist slate grey background — full frame',
        label: 'Full frame',
      },
      {
        alt: 'Texture detail of the slate surface',
        label: 'Texture detail',
      },
      {
        alt: 'Mockup: background behind sample menu type',
        label: 'Menu mockup',
      },
    ],
    sizes: [
      { id: 'personal', label: 'Single location', price: '$45.00' },
      { id: 'regional', label: 'Up to 5 locations', price: '$95.00' },
      { id: 'enterprise', label: 'Unlimited locations', price: '$195.00' },
    ],
    finishes: FINISHES_DIGITAL,
    collectionId: 'menu-backgrounds',
    newestOrder: 1,
    popularityOrder: 4,
    grid: {
      colClass: 'col-span-12 md:col-span-4 mt-12',
      imageAspect: 'aspect-[3/4]',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'tuscany-terrace-fine-art-print',
    title: 'Tuscany Terrace Fine Art Print',
    subtitle: 'Limited Edition (1 of 50)',
    displayPrice: '$320.00',
    description:
      'Golden-hour light over a quiet terrace—this piece brings depth and travel romance to intimate dining rooms. Each print is numbered, signed in the margin, and produced on museum-grade cotton rag for longevity in climate-controlled hospitality spaces.',
    imageHints: [
      {
        alt: 'Tuscany terrace at golden hour — full image',
        label: 'Full artwork',
      },
      {
        alt: 'Cropped detail of terrace architecture',
        label: 'Architectural detail',
      },
      {
        alt: 'Framed preview in a neutral interior',
        label: 'Framed preview',
      },
    ],
    sizes: [
      { id: '16x20', label: `16 × 20"`, price: '$220.00' },
      { id: '20x30', label: `20 × 30"`, price: '$280.00' },
      { id: '24x36', label: `24 × 36"`, price: '$320.00' },
    ],
    finishes: FINISHES_PRINT,
    collectionId: 'limited-edition',
    newestOrder: 2,
    popularityOrder: 5,
    grid: {
      colClass: 'col-span-12 md:col-span-4 -mt-8',
      imageAspect: 'aspect-[4/5]',
      titleClass: 'text-lg',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'artisan-spice-still-life',
    title: 'Artisan Spice Still Life',
    subtitle: `Kitchen Collection | 18x18"`,
    displayPrice: '$120.00',
    description:
      'Rich tones and careful composition make this print a natural fit for open kitchens and chef’s counters. The square format balances shelving and tile lines, and pairs well with brass, wood, and stone interiors.',
    imageHints: [
      {
        alt: 'Artisan spice still life — full composition',
        label: 'Full artwork',
      },
      {
        alt: 'Close-up of spices and surfaces',
        label: 'Ingredient detail',
      },
      {
        alt: 'Hanging in a kitchen pass',
        label: 'Pass preview',
      },
    ],
    sizes: [
      { id: '12x12', label: `12 × 12"`, price: '$85.00' },
      { id: '18x18', label: `18 × 18"`, price: '$120.00' },
      { id: '24x24', label: `24 × 24"`, price: '$165.00' },
    ],
    finishes: FINISHES_PRINT,
    collectionId: 'posters',
    newestOrder: 3,
    popularityOrder: 3,
    grid: {
      colClass: 'col-span-12 md:col-span-4 mt-16',
      imageAspect: 'aspect-square',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'modern-cafe-series-04',
    title: 'Modern Café Series #04',
    subtitle: 'Matte Canvas Print',
    displayPrice: '$155.00',
    description:
      'Part of our Modern Café series: aerial-inspired composition with calm neutrals for coffee bars and all-day cafés. Stretched on thick gallery canvas with tight corners and a protective matte coating suited to high-traffic seating areas.',
    imageHints: [
      {
        alt: 'Modern café artwork — full composition',
        label: 'Full artwork',
      },
      {
        alt: 'Texture of matte canvas weave',
        label: 'Canvas texture',
      },
      {
        alt: 'Above a marble counter with cups',
        label: 'Counter styling',
      },
    ],
    sizes: [
      { id: '16x20', label: `16 × 20"`, price: '$115.00' },
      { id: '20x24', label: `20 × 24"`, price: '$135.00' },
      { id: '24x30', label: `24 × 30"`, price: '$155.00' },
    ],
    finishes: [
      { id: 'canvas-matte', label: 'Matte canvas (stretched)' },
      { id: 'canvas-satin', label: 'Satin canvas (stretched)' },
      { id: 'framed-float', label: 'Float frame add-on' },
    ],
    collectionId: 'custom-prints',
    newestOrder: 4,
    popularityOrder: 4,
    grid: {
      colClass: 'col-span-12 md:col-span-4',
      imageAspect: 'aspect-[4/5]',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
]

const bySlug = new Map(SHOP_PRODUCTS.map((p) => [p.slug, p]))

export function getAllShopProducts(): ShopProduct[] {
  return SHOP_PRODUCTS
}

export function getShopProductSlugs(): string[] {
  return SHOP_PRODUCTS.map((p) => p.slug)
}

export function getShopProductBySlug(slug: string): ShopProduct | undefined {
  return bySlug.get(slug)
}

export function filterAndSortShopProducts(
  collection: ShopCollectionParam,
  sort: ShopSortParam,
): ShopProduct[] {
  const list =
    collection === 'all'
      ? [...SHOP_PRODUCTS]
      : SHOP_PRODUCTS.filter((p) => p.collectionId === collection)

  const price = (p: ShopProduct) => parsePriceToNumber(p.displayPrice)

  switch (sort) {
    case 'price-asc':
      list.sort((a, b) => price(a) - price(b))
      break
    case 'price-desc':
      list.sort((a, b) => price(b) - price(a))
      break
    case 'popularity':
      list.sort((a, b) => b.popularityOrder - a.popularityOrder)
      break
    case 'newest':
    default:
      list.sort((a, b) => a.newestOrder - b.newestOrder)
      break
  }

  return list
}
