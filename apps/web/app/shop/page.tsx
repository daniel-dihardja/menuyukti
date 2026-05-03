import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ShopHero, ShopProductGrid, ShopWorkflowContextBanner } from '@/components/shop'
import { filterAndSortShopProducts } from '@/components/shop/shop-catalog'

const WORKFLOW_ID_RE = /^\d+$/

function pickWorkflowId(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v == null || v === '') return null
  return WORKFLOW_ID_RE.test(v) ? v : null
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

type ShopPageProps = {
  searchParams: Promise<{ workflowId?: string | string[] }>
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const products = filterAndSortShopProducts('all', 'newest')
  const sp = await searchParams
  const workflowId = pickWorkflowId(sp.workflowId)

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <main
        className="shop-horizontal-padding-x mx-auto w-full min-w-0 max-w-[1440px] flex-1"
        id="shop-main"
        tabIndex={-1}
      >
        {workflowId ? <ShopWorkflowContextBanner workflowId={workflowId} /> : null}
        <ShopHero />
        <ShopProductGrid products={products} />
      </main>
    </div>
  )
}
