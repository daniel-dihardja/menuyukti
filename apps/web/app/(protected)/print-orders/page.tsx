export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

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

export default async function Page() {
  const t = await getTranslations('platform.printOrders')
  const { userId } = await auth()
  if (!userId) {
    redirect(routes.login)
  }

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
        <CardContent className="flex justify-center pb-8">
          <Button asChild>
            <Link href={routes.shop}>{t('browseShop')}</Link>
          </Button>
        </CardContent>
      </Card>
    </AnalyticsPageShell>
  )
}
