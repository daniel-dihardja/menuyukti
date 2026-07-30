import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@workspace/ui/components/button'
import Link from 'next/link'
import {
  getCachedAnalyticsRun,
  getCachedAnalyticsBundleHeatmap,
  getCachedLocation,
} from '@/lib/graphql/cached-queries'
import { deriveDailyHeatmapHourRange } from '@/lib/analytics/heatmap-hours'
import { getAppCurrencyLocale } from '@/lib/app-currency'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { HeatmapViewDynamic } from './heatmap-view-dynamic'
import { cn } from '@workspace/ui/lib/utils'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.heatmap')
  const title = t('reportTitle')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

function HeatmapReportSkeleton() {
  return <Skeleton className="min-h-[24rem] w-full rounded-lg" />
}

async function HeatmapReportContent({
  analyticsId,
  userId,
  locationId,
}: {
  analyticsId: number
  userId: string
  locationId: string
}) {
  const locale = getAppCurrencyLocale()
  const id = String(analyticsId)
  const [bundleData, locationData] = await Promise.all([
    getCachedAnalyticsBundleHeatmap(userId, id, locationId),
    getCachedLocation(userId, locationId),
  ])
  const bundle = bundleData.analyticsBundle
  const menuHeatmaps = bundle?.menuHeatmaps ?? []
  const matrixItems = bundle?.menuEngineeringMatrix?.items ?? null
  const { startHour: dailyStartHour, endHour: dailyEndHour } = deriveDailyHeatmapHourRange(
    locationData.location?.openingHours ?? [],
  )

  return (
    <HeatmapViewDynamic
      analyticsId={analyticsId}
      menuHeatmaps={menuHeatmaps}
      matrixItems={matrixItems}
      locale={locale}
      dailyStartHour={dailyStartHour}
      dailyEndHour={dailyEndHour}
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const tSales = await getTranslations('analytics.sales')
  const tHeatmap = await getTranslations('analytics.heatmap')
  const tShared = await getTranslations('analytics.shared')

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
      title={tHeatmap('reportTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tHeatmap('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading title={tHeatmap('heading')} description={tHeatmap('description')} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
        </div>

        <Suspense fallback={<HeatmapReportSkeleton />}>
          <HeatmapReportContent analyticsId={analyticsId} userId={userId} locationId={locationId} />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
