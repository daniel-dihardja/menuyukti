import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CopyrightFooter } from '@/components/copyright-footer'
import { ShopFilterBar, ShopHero, ShopProductGrid } from '@/components/shop'
import { filterAndSortShopProducts } from '@/components/shop/shop-catalog'
import { loadShopListParams } from '@/lib/shop/shop-list-params'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

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

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { collection, sort } = await loadShopListParams(sp)
  const products = filterAndSortShopProducts(collection, sort)

  return (
    <div className="flex flex-1 flex-col">
      <main
        className="mx-auto w-full max-w-[1440px] flex-1 px-6 md:px-12"
        id="shop-main"
        tabIndex={-1}
      >
        <ShopHero />
        <ShopFilterBar />
        <ShopProductGrid products={products} />
      </main>
      <CopyrightFooter />
    </div>
  )
}
