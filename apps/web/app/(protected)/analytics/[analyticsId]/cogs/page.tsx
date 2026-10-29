import { auth } from '@clerk/nextjs/server'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { UpdateCogsForm } from './update-cogs-form'
import { buildCogsEditorItems } from '@/lib/analytics/build-cogs-editor-items'
import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import { getCachedAnalyticsRunsByLocation } from '@/lib/graphql/cached-queries'
import { ANALYTICS_RUN_METADATA_QUERY, type AnalyticsRunMetadataData } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'

type PageProps = {
  params: Promise<{
    analyticsId?: string
  }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.cogs')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

function CogsReportSkeleton() {
  return <Skeleton className="min-h-[24rem] w-full rounded-lg" />
}

async function CogsReportContent({ analyticsId, userId }: { analyticsId: number; userId: string }) {
  const built = await buildCogsEditorItems(userId, analyticsId)
  if (!built) notFound()

  const otherRuns = await getCachedAnalyticsRunsByLocation(userId, built.locationId)
  const analyticsOptions = otherRuns.filter((option) => option.id !== analyticsId)

  return (
    <UpdateCogsForm
      analyticsId={analyticsId}
      locationId={built.locationId}
      menuItems={built.items}
      analyticsOptions={analyticsOptions}
      currencyCode={built.currencyCode}
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const t = await getTranslations('analytics')
  const tSales = await getTranslations('analytics.sales')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await graphqlQuery<AnalyticsRunMetadataData>(
    ANALYTICS_RUN_METADATA_QUERY,
    { id },
    userId,
    'AnalyticsRunMetadata',
  )
  const run = runData.analyticsRun
  if (!run) notFound()

  const salesHref = routes.analytics.salesWithLocation(run.locationId)

  const analyticsName = run.name ?? run.filename ?? `Analytics #${analyticsId}`

  return (
    <AnalyticsPageShell
      title={t('cogs.edit')}
      breadcrumbs={[
        { label: tSales('title'), href: salesHref },
        { label: analyticsName },
        { label: t('cogs.title') },
      ]}
    >
      <Suspense fallback={<CogsReportSkeleton />}>
        <CogsReportContent analyticsId={analyticsId} userId={userId} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
