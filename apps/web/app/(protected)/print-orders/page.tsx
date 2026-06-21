import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { connection } from 'next/server'

import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Package } from 'lucide-react'

import { ShopPrintOrdersPreview } from '@/components/shop/shop-print-orders-preview'

export default async function Page() {
  await connection()
  const t = await getTranslations('platform.printOrders')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading title={t('title')} description={t('description')} />
      <Card className="border-dashed">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-md border bg-muted">
            <Package className="size-6" aria-hidden />
          </div>
          <CardTitle>{t('emptyTitle')}</CardTitle>
          <CardDescription className="max-w-md">{t('emptyDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-2">
          <Button asChild variant="secondary">
            <Link href={routes.shop}>{t('browseShop')}</Link>
          </Button>
        </CardContent>
      </Card>
      <ShopPrintOrdersPreview />
    </AnalyticsPageShell>
  )
}
