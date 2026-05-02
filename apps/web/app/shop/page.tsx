import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ShopHero, ShopProductGrid } from '@/components/shop'
import { filterAndSortShopProducts } from '@/components/shop/shop-catalog'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shop')
  const title = t('listMetaTitle')
  const description = t('listMetaDescription')
  return {
    title,
    description,
    openGraph: {
      title,
      description,
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
