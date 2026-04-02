export type ShopProductImage = {
  src: string;
  alt: string;
  label: string;
};

export type ShopSizeVariant = {
  id: string;
  label: string;
  price: string;
};

export type ShopFinishVariant = {
  id: string;
  label: string;
};

export type ShopProductGridLayout = {
  colClass: string;
  imageAspect: string;
  titleClass: string;
  addToCartClass: string;
};

export type ShopProduct = {
  slug: string;
  title: string;
  subtitle: string;
  /** Price shown on the shop grid (matches hero SKU). */
  displayPrice: string;
  images: ShopProductImage[];
  description: string;
  sizes: ShopSizeVariant[];
  finishes: ShopFinishVariant[];
  grid: ShopProductGridLayout;
};

const IMG_FARM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDummuV71jm-AxhFQiQY5EPlVt_FpNdtIkgfjONTCWKPjfA2mmVN6GW_NmepoU_tW0L2FekljTbwwS8Cc9XDfN6A6gx5_6QLcFMhVoB6xozTQ8m35m3FDpjNTOS39Mcn1-VoIQrT1XQ6YDWc_rZLLNyx8SDKmN8k8tzRVRBKe9QKZMT8KWLL5mpWoNnPt3eB1onyGsfAXcWh71RUWmX6vBwDZb5JlcbMTm3ayV-eaQ917IrGoayei7WbmJh8YVmKi-PhCTvLBwCpd-S";

const IMG_SLATE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB24Ib5PeI1XZ4RzWnOqkdX8ZeJ9aHECYNhJCL6Zwy0W75nqC7EmbP0JEfvvKOtM7iUtLxMAG7orkL4Gar3_EqJOjR59_4fs8iFluUmklCyB2l_8wYdi-rIv0FJhoEI4hKTO1TsdpMnpxWzNzll3F9cQCUgKPZOSwVpUz7JbBbcMFDuD97kakPwuDEqUFMRaUC-QSbGBFwre-vydZcdb9pi3qJNmDlqxJA9jK9QOFe2_Aq2H46jqa5HLtVzT27DkaOhwDj-qin8yydu";

const IMG_TUSCANY =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCNg9F1cdzWiNDCxcUgLATGdEllfxszdPLEDF4v8hnwv2dY3pfocG8W_v-0cZ1FW7AoUd4x6PmypDsT_La-UjixrzVcAwr4gpDM5iECudVubWGuoh3jjiDrpHh1s3eRx_snMM9Bj0UepDoi4X2Ko_8HDOMAgBFD7EZdgNQuZL5-rfZATYQCYhVGep4191QrEn7v_K_mwzKPgDuQlBpaBOynHOccJq8_-HM2tcIcKPoz2AZN9RMnQ4eVQ_8Kd5b491yVKQBgA5bhOi7H";

const IMG_SPICE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAiaTjdjNKFDBx1-9mRAxfRr8AjVgvcSfYnpywAxFjLmm_A6aKS1b2ylJEhDRqDQ4tdBENafSJ-8wn2WTmlfNiJjbDuahV_47aTy5CVfMhke54in_9gq_N1xeqCTBglUW0GmLM_UeoxOot9V6fs77_5fyY8wWSnzZXTu5sKWCe3xjFWKSv18cnCs-PdkQiohMaMsF72A4V_BYc3cOuCLkCUuGZzi-sbJNFQJKzt8YoeOko6uF2VxDxuW27Z1e714HbII2lmwok_N0QY";

const IMG_CAFE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAuIwVc5bP74DCQO5JNFT1VEp9u2sAzK1k20E_F1NHQRwjP5NRjNdHbDFG7YfH76ow2VP72ziayaGfCdMDXibjXK_PMz_u6a-PkTADA8qCLwZ5gyK2dBfUL1Wjtq1Ne1MqELPknp-3eZu6PbR4YYSkUYSkrErz-gjP6mraPfLnbkf8uenvp5U0jyVZyhx_2-MN1JKLxiKbV9Zurfx7yBlyvvCTTupcDgjEPB_mrLHFzJM3lS_tL0laSaoWoW2W9vufQEQW7g440NDTi";

const FINISHES_PRINT: ShopFinishVariant[] = [
  { id: "matte", label: "Fine art matte" },
  { id: "semi-gloss", label: "Semi-gloss photo" },
  { id: "canvas", label: "Gallery canvas" },
];

const FINISHES_DIGITAL: ShopFinishVariant[] = [
  { id: "rgb", label: "sRGB (web & screens)" },
  { id: "cmyk", label: "CMYK (print-ready)" },
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    slug: "rustic-farm-to-table-poster",
    title: "Rustic Farm-to-Table Poster",
    subtitle: `Series: Organic Origins | 24x36"`,
    displayPrice: "$185.00",
    description:
      "A warm, editorial photograph celebrating seasonal produce and honest plating—ideal for dining rooms, open kitchens, and farm-to-table concepts. Printed on archival paper with rich color fidelity and a soft matte surface that minimizes glare under restaurant lighting.",
    images: [
      {
        src: IMG_FARM,
        alt: "Full artwork: rustic farm-to-table vegetable arrangement",
        label: "Full artwork",
      },
      {
        src: IMG_FARM,
        alt: "Detail: texture and color on the poster surface",
        label: "Paper detail",
      },
      {
        src: IMG_FARM,
        alt: "Lifestyle: artwork in a bright dining space",
        label: "In-room preview",
      },
    ],
    sizes: [
      { id: "12x18", label: `12 × 18"`, price: "$95.00" },
      { id: "18x24", label: `18 × 24"`, price: "$145.00" },
      { id: "24x36", label: `24 × 36"`, price: "$185.00" },
      { id: "30x40", label: `30 × 40"`, price: "$240.00" },
    ],
    finishes: FINISHES_PRINT,
    grid: {
      colClass: "col-span-12 md:col-span-8",
      imageAspect: "aspect-[16/9]",
      titleClass: "text-2xl",
      addToCartClass: "text-xs",
    },
  },
  {
    slug: "minimalist-slate-menu-background",
    title: "Minimalist Slate Menu Background",
    subtitle: "Digital Asset Bundle",
    displayPrice: "$45.00",
    description:
      "A versatile slate-toned backdrop pack for menus, specials boards, and social posts. Includes layered files and high-resolution exports so your brand team can drop in typography fast. Licensed for use across your restaurant group’s digital and print touchpoints.",
    images: [
      {
        src: IMG_SLATE,
        alt: "Minimalist slate grey background — full frame",
        label: "Full frame",
      },
      {
        src: IMG_SLATE,
        alt: "Texture detail of the slate surface",
        label: "Texture detail",
      },
      {
        src: IMG_SLATE,
        alt: "Mockup: background behind sample menu type",
        label: "Menu mockup",
      },
    ],
    sizes: [
      { id: "personal", label: "Single location", price: "$45.00" },
      { id: "regional", label: "Up to 5 locations", price: "$95.00" },
      { id: "enterprise", label: "Unlimited locations", price: "$195.00" },
    ],
    finishes: FINISHES_DIGITAL,
    grid: {
      colClass: "col-span-12 md:col-span-4 mt-12",
      imageAspect: "aspect-[3/4]",
      titleClass: "text-lg leading-tight",
      addToCartClass: "text-[10px]",
    },
  },
  {
    slug: "tuscany-terrace-fine-art-print",
    title: "Tuscany Terrace Fine Art Print",
    subtitle: "Limited Edition (1 of 50)",
    displayPrice: "$320.00",
    description:
      "Golden-hour light over a quiet terrace—this piece brings depth and travel romance to intimate dining rooms. Each print is numbered, signed in the margin, and produced on museum-grade cotton rag for longevity in climate-controlled hospitality spaces.",
    images: [
      {
        src: IMG_TUSCANY,
        alt: "Tuscany terrace at golden hour — full image",
        label: "Full artwork",
      },
      {
        src: IMG_TUSCANY,
        alt: "Cropped detail of terrace architecture",
        label: "Architectural detail",
      },
      {
        src: IMG_TUSCANY,
        alt: "Framed preview in a neutral interior",
        label: "Framed preview",
      },
    ],
    sizes: [
      { id: "16x20", label: `16 × 20"`, price: "$220.00" },
      { id: "20x30", label: `20 × 30"`, price: "$280.00" },
      { id: "24x36", label: `24 × 36"`, price: "$320.00" },
    ],
    finishes: FINISHES_PRINT,
    grid: {
      colClass: "col-span-12 md:col-span-4 -mt-8",
      imageAspect: "aspect-[4/5]",
      titleClass: "text-lg",
      addToCartClass: "text-[10px]",
    },
  },
  {
    slug: "artisan-spice-still-life",
    title: "Artisan Spice Still Life",
    subtitle: `Kitchen Collection | 18x18"`,
    displayPrice: "$120.00",
    description:
      "Rich tones and careful composition make this print a natural fit for open kitchens and chef’s counters. The square format balances shelving and tile lines, and pairs well with brass, wood, and stone interiors.",
    images: [
      {
        src: IMG_SPICE,
        alt: "Artisan spice still life — full composition",
        label: "Full artwork",
      },
      {
        src: IMG_SPICE,
        alt: "Close-up of spices and surfaces",
        label: "Ingredient detail",
      },
      {
        src: IMG_SPICE,
        alt: "Hanging in a kitchen pass",
        label: "Pass preview",
      },
    ],
    sizes: [
      { id: "12x12", label: `12 × 12"`, price: "$85.00" },
      { id: "18x18", label: `18 × 18"`, price: "$120.00" },
      { id: "24x24", label: `24 × 24"`, price: "$165.00" },
    ],
    finishes: FINISHES_PRINT,
    grid: {
      colClass: "col-span-12 md:col-span-4 mt-16",
      imageAspect: "aspect-square",
      titleClass: "text-lg leading-tight",
      addToCartClass: "text-[10px]",
    },
  },
  {
    slug: "modern-cafe-series-04",
    title: "Modern Café Series #04",
    subtitle: "Matte Canvas Print",
    displayPrice: "$155.00",
    description:
      "Part of our Modern Café series: aerial-inspired composition with calm neutrals for coffee bars and all-day cafés. Stretched on thick gallery canvas with tight corners and a protective matte coating suited to high-traffic seating areas.",
    images: [
      {
        src: IMG_CAFE,
        alt: "Modern café artwork — full composition",
        label: "Full artwork",
      },
      {
        src: IMG_CAFE,
        alt: "Texture of matte canvas weave",
        label: "Canvas texture",
      },
      {
        src: IMG_CAFE,
        alt: "Above a marble counter with cups",
        label: "Counter styling",
      },
    ],
    sizes: [
      { id: "16x20", label: `16 × 20"`, price: "$115.00" },
      { id: "20x24", label: `20 × 24"`, price: "$135.00" },
      { id: "24x30", label: `24 × 30"`, price: "$155.00" },
    ],
    finishes: [
      { id: "canvas-matte", label: "Matte canvas (stretched)" },
      { id: "canvas-satin", label: "Satin canvas (stretched)" },
      { id: "framed-float", label: "Float frame add-on" },
    ],
    grid: {
      colClass: "col-span-12 md:col-span-4",
      imageAspect: "aspect-[4/5]",
      titleClass: "text-lg leading-tight",
      addToCartClass: "text-[10px]",
    },
  },
];

const bySlug = new Map(SHOP_PRODUCTS.map((p) => [p.slug, p]));

export function getAllShopProducts(): ShopProduct[] {
  return SHOP_PRODUCTS;
}

export function getShopProductSlugs(): string[] {
  return SHOP_PRODUCTS.map((p) => p.slug);
}

export function getShopProductBySlug(slug: string): ShopProduct | undefined {
  return bySlug.get(slug);
}
