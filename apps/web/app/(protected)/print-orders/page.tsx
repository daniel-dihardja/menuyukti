import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { connection } from 'next/server'

import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@workspace/ui/components/button'
import { Package } from 'lucide-react'

import { ShopPrintOrdersPreview } from '@/components/shop/shop-print-orders-preview'

export default async function Page() {
  await connection()
  const t = await getTranslations('platform.printOrders')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading title={t('title')} description={t('description')} />
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-md border bg-muted">
          <Package className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{t('emptyTitle')}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href={routes.shop}>{t('browseShop')}</Link>
        </Button>
      </section>
      <ShopPrintOrdersPreview />
    </AnalyticsPageShell>
  )
}
