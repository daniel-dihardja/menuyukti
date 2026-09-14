import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Badge } from '@workspace/ui/components/badge'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { auth } from '@clerk/nextjs/server'
import { getCachedAnalyticsRunsByLocation, getCachedLocation } from '@/lib/graphql/cached-queries'
import { AnalyticsSalesClient } from '@/app/(protected)/analytics/sales/analytics-sales-client'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('analytics.sales')
  const description = t('description')
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('title'), description, openGraph: { title: t('title'), description } }
  }
  const data = await getCachedLocation(userId, id)
  const title = data.location ? `${data.location.name} · ${t('title')}` : t('title')
  return { title, description, openGraph: { title, description } }
}

function PosUploadInfoSection({ t }: { t: Awaited<ReturnType<typeof getTranslations>> }) {
  const reportRequirements = [
    {
      key: 'esb',
      pos: t('uploadInfo.reports.esb.pos'),
      report: t('uploadInfo.reports.esb.report'),
    },
    {
      key: 'quino',
      pos: t('uploadInfo.reports.quino.pos'),
      report: t('uploadInfo.reports.quino.report'),
    },
  ]

  return (
    <section aria-labelledby="upload-info-heading" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h2 id="upload-info-heading" className="text-sm font-semibold">
          {t('uploadInfo.title')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('uploadInfo.description')}</p>
      </div>
      <div className="flex flex-col gap-2">
        {reportRequirements.map((item) => (
          <div
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <span className="text-xs font-medium">{item.pos}</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {item.report}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  )
}

function SalesPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border p-8">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="mt-4 h-4 w-3/4 max-w-lg" />
      </div>
    </div>
  )
}

async function LocationReportsData({ locationId }: { locationId: number }) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const [locationData, initialAnalytics] = await Promise.all([
    getCachedLocation(userId, String(locationId)),
    getCachedAnalyticsRunsByLocation(userId, locationId),
  ])

  const location = locationData.location
  if (!location) notFound()

  return (
    <AnalyticsSalesClient
      branches={[{ id: locationId, name: location.name }]}
      initialLocationId={locationId}
      initialAnalytics={initialAnalytics}
      lockLocation
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const locationId = Number(id)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationData = await getCachedLocation(userId, id)
  const location = locationData.location
  if (!location) notFound()

  const t = await getTranslations('analytics.sales')
  const tBranches = await getTranslations('analytics.branches')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[
        { label: tBranches('title'), href: routes.analytics.branches },
        { label: location.name, href: routes.analytics.branchesDetail(location.id) },
        { label: t('title') },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading title={t('title')} description={t('description')} />
        <PosUploadInfoSection t={t} />
        <Suspense fallback={<SalesPageSkeleton />}>
          <LocationReportsData locationId={locationId} />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
