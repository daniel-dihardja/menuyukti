import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ShopHero } from '@/components/shop/shop-hero'
import { ShopProductGrid } from '@/components/shop/shop-product-grid'
import { filterAndSortShopProducts } from '@/lib/shop/shop-catalog'

const SHOP_URL = 'https://menuyukti.com/shop'
const shopOgImage = {
  url: 'https://menuyukti.com/images/pod-hero-02.webp',
  width: 2880,
  height: 1234,
  alt: 'Gastronomy-inspired wall art for restaurants, bars and cafés — The Digital Curator by Menuyukti',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shop')
  const title = t('listMetaTitle')
  const description = t('listMetaDescription')
  return {
    title,
    description,
    alternates: {
      canonical: SHOP_URL,
    },
    openGraph: {
      title,
      description,
      url: SHOP_URL,
      siteName: 'Menuyukti',
      images: [shopOgImage],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [shopOgImage.url],
    },
  }
}

export default async function ShopPage() {
  const products = filterAndSortShopProducts('all', 'newest')

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <main
        className="shop-horizontal-padding-x mx-auto w-full min-w-0 max-w-[1440px] flex-1"
        id="shop-main"
        tabIndex={-1}
      >
        <ShopHero />
        <ShopProductGrid products={products} />
      </main>
    </div>
  )
}
