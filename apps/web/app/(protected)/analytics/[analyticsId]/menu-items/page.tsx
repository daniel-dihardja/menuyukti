import { auth } from '@clerk/nextjs/server'
import { Button } from '@workspace/ui/components/button'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getAppCurrencyCode, getAppCurrencyLocale } from '@/lib/app-currency'
import { promotionItemsToTableRows } from '@/lib/analytics/menu-items-page-adapter'
import { getCachedAnalyticsRun, getCachedPromotionMenuItems } from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'
import { MenuItemsTable } from './menu-items-table'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
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

  const promotionItemsData = await getCachedPromotionMenuItems(userId, id, String(run.locationId))

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`
  const locale = getAppCurrencyLocale()
  const currency = getAppCurrencyCode()

  const items = promotionItemsData.promotionMenuItems?.items ?? null
  const rows = promotionItemsToTableRows(items, locale)

  return (
    <AnalyticsPageShell
      title={tMenuItems('reportTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMenuItems('breadcrumb') },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading title={tMenuItems('heading')} description={tMenuItems('description')} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tMenuItems('backToSales')}</Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {tMenuItems('empty')}
          </div>
        ) : (
          <MenuItemsTable rows={rows} locale={locale} currency={currency} />
        )}
      </section>
    </AnalyticsPageShell>
  )
}
