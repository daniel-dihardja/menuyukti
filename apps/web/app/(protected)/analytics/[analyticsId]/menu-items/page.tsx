import { auth } from '@clerk/nextjs/server'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getAppCurrencyCode, getAppCurrencyLocale } from '@/lib/app-currency'
import { promotionItemsToTableRows } from '@/lib/analytics/menu-items-page-adapter'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedAnalyticsRun, getCachedPromotionMenuItems } from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'
import { MenuItemsTable } from './menu-items-table'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

function MenuItemsReportSkeleton() {
  return <Skeleton className="min-h-[24rem] w-full rounded-lg" />
}

async function MenuItemsReportContent({
  analyticsId,
  userId,
  locationId,
}: {
  analyticsId: number
  userId: string
  locationId: string
}) {
  const tMenuItems = await getTranslations('analytics.menuItems')
  const id = String(analyticsId)
  const promotionItemsData = await getCachedPromotionMenuItems(userId, id, locationId)
  const locale = getAppCurrencyLocale()
  const currency = getAppCurrencyCode()
  const items = promotionItemsData.promotionMenuItems?.items ?? null
  const rows = promotionItemsToTableRows(items, locale)

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {tMenuItems('empty')}
      </div>
    )
  }

  return <MenuItemsTable rows={rows} locale={locale} currency={currency} />
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const tSales = await getTranslations('analytics.sales')
  const tMenuItems = await getTranslations('analytics.menuItems')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await getCachedAnalyticsRun(userId, id)
  const run = runData.analyticsRun
  if (!run) notFound()

  const locationId = String(run.locationId)
  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`

  return (
    <AnalyticsPageShell
      title={tMenuItems('reportTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMenuItems('breadcrumb') },
      ]}
    >
      <section className={cn('space-y-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading title={tMenuItems('heading')} description={tMenuItems('description')} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tMenuItems('backToSales')}</Link>
          </Button>
        </div>

        <Suspense fallback={<MenuItemsReportSkeleton />}>
          <MenuItemsReportContent
            analyticsId={analyticsId}
            locationId={locationId}
            userId={userId}
          />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
