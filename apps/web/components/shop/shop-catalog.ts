import type { ShopCollectionParam, ShopSortParam } from '@/lib/shop/shop-list-params'
import { shopDeliverableObjectKey } from '@/lib/shop/shop-deliverables'

export type ShopDigitalDeliverable = {
  /** Full S3 object key for the file users download (not under `menuyukti/shop/{slug}/`). */
  objectKey: string
  downloadFilename: string
}

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
  | 'digital-downloads'

export type ShopProduct = {
  slug: string
  title: string
  subtitle: string
  /** Price shown on the shop grid (matches hero SKU). */
  displayPrice: string
  /** Alt/label hints merged with S3 images by index (see `resolveShopImages`). */
  imageHints: ShopProductImageHint[]
  /**
   * Full S3 object keys for gallery/preview images (presigned GET). When set, used instead of listing `menuyukti/shop/{slug}/`.
   * Use for previews stored under `shop-deliverables/{slug}/` or other explicit keys.
   */
  s3PreviewObjectKeys?: string[]
  description: string
  sizes: ShopSizeVariant[]
  finishes: ShopFinishVariant[]
  /** When set, PDP shows a free digital download flow instead of print-on-demand selectors. */
  digitalDeliverable?: ShopDigitalDeliverable
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
    slug: 'p-07',
    title: 'Kitchen scene illustration — digital download',
    subtitle: 'High-resolution JPG · Complimentary',
    displayPrice: 'Free',
    description:
      'Download a full-resolution hires JPEG (6656×9984 px, portrait) for your print shop or lab. That resolution supports a sharp landscape poster up to about 24×18 inches at 300 DPI—ideal for dining rooms, open kitchens, or pass-through walls—with detail to spare for slight crops. Use the lightweight preview on the shop for web and screens only; the hires file is the one to send for inkjet or giclée output.',
    imageHints: [
      {
        alt: 'Kitchen scene illustration — preview',
        label: 'Preview',
      },
    ],
    s3PreviewObjectKeys: [shopDeliverableObjectKey('p-07', 'lowres_832x1284.jpg')],
    sizes: [],
    finishes: [],
    digitalDeliverable: {
      objectKey: shopDeliverableObjectKey('p-07', 'hires_6656x9984.jpg'),
      downloadFilename: 'menuyukti-p-07-hires.jpg',
    },
    collectionId: 'digital-downloads',
    newestOrder: 0,
    popularityOrder: 3,
    grid: {
      colClass: 'col-span-12 md:col-span-4 mt-12',
      imageAspect: 'aspect-[832/1284]',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'p-03',
    title: 'Illustration variation — digital download',
    subtitle: 'High-resolution JPG · Complimentary',
    displayPrice: 'Free',
    description:
      'A high-resolution illustration you download as a JPEG and send to your print shop or lab—ideal for a large wall poster (for example 18×24 inches vertical at well over 300 DPI). The file is 6656×9984 pixels (portrait), so detail stays sharp at poster sizes and you still have room to crop or scale slightly. You can also use the same asset on in-venue screens, menus, or your website. The shop preview is a lighter web-friendly image, not the print file.',
    imageHints: [
      {
        alt: 'Illustration variation — preview',
        label: 'Preview',
      },
    ],
    s3PreviewObjectKeys: [shopDeliverableObjectKey('p-03', 'lowres_832x1284.jpg')],
    sizes: [],
    finishes: [],
    digitalDeliverable: {
      objectKey: shopDeliverableObjectKey('p-03', 'hires_6656x9984.jpg'),
      downloadFilename: 'menuyukti-p-03-hires.jpg',
    },
    collectionId: 'digital-downloads',
    newestOrder: 1,
    popularityOrder: 3,
    grid: {
      colClass: 'col-span-12 md:col-span-4 mt-12',
      imageAspect: 'aspect-[832/1284]',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'p-08',
    title: 'Kitchen illustration — digital download',
    subtitle: 'High-resolution JPG · Complimentary',
    displayPrice: 'Free',
    description:
      'A high-resolution illustration you download as a JPEG and send to your print shop or lab—ideal for a large wall poster (for example 18×24 inches vertical at well over 300 DPI). The file is 6656×9984 pixels (portrait), so detail stays sharp at poster sizes and you still have room to crop or scale slightly. You can also use the same asset on in-venue screens, menus, or your website. The shop preview is a lighter web-friendly image, not the print file.',
    imageHints: [
      {
        alt: 'Kitchen illustration — preview',
        label: 'Preview',
      },
    ],
    s3PreviewObjectKeys: [shopDeliverableObjectKey('p-08', 'lowres_832x1248.jpg')],
    sizes: [],
    finishes: [],
    digitalDeliverable: {
      objectKey: shopDeliverableObjectKey('p-08', 'hires_6656x9984.jpg'),
      downloadFilename: 'menuyukti-p-08-hires.jpg',
    },
    collectionId: 'digital-downloads',
    newestOrder: 2,
    popularityOrder: 3,
    grid: {
      colClass: 'col-span-12 md:col-span-4 mt-12',
      imageAspect: 'aspect-[2/3]',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
  {
    slug: 'p-09',
    title: 'Heritage kitchen illustration — digital download',
    subtitle: 'High-resolution JPG · Complimentary',
    displayPrice: 'Free',
    description:
      'A high-resolution illustration you download as a JPEG and send to your print shop or lab—ideal for a large wall poster (for example 18×24 inches vertical at well over 300 DPI). The file is 6656×9984 pixels (portrait), so detail stays sharp at poster sizes and you still have room to crop or scale slightly. You can also use the same asset on in-venue screens, menus, or your website. The shop preview is a lighter web-friendly image, not the print file.',
    imageHints: [
      {
        alt: 'Heritage kitchen illustration — preview',
        label: 'Preview',
      },
    ],
    s3PreviewObjectKeys: [shopDeliverableObjectKey('p-09', 'lowres_832x1248.jpg')],
    sizes: [],
    finishes: [],
    digitalDeliverable: {
      objectKey: shopDeliverableObjectKey('p-09', 'highres_6656x9984.jpg'),
      downloadFilename: 'menuyukti-p-09-highres.jpg',
    },
    collectionId: 'digital-downloads',
    newestOrder: 3,
    popularityOrder: 3,
    grid: {
      colClass: 'col-span-12 md:col-span-4 mt-12',
      imageAspect: 'aspect-[2/3]',
      titleClass: 'text-lg leading-tight',
      addToCartClass: 'text-xs',
    },
  },
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
    newestOrder: 4,
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
    newestOrder: 5,
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
    newestOrder: 6,
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
    newestOrder: 7,
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
    newestOrder: 8,
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

  switch (sort) {
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
