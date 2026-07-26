import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { routes } from '@/lib/routes'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { auth } from '@clerk/nextjs/server'
import {
  getCachedAnalyticsRunsByLocation,
  getCachedLocationsListData,
} from '@/lib/graphql/cached-queries'
import { AnalyticsSalesClient } from './analytics-sales-client'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { cn } from '@workspace/ui/lib/utils'

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
      <section className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs" />
      </section>
      <div className="rounded-md border p-8">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="mt-4 h-4 w-3/4 max-w-lg" />
      </div>
    </div>
  )
}

function parseRequestedLocationId(raw: string | undefined): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

function resolveInitialLocationId(
  branches: Array<{ id: number }>,
  requestedLocationId: number | null,
): number | null {
  if (
    requestedLocationId !== null &&
    branches.some((branch) => branch.id === requestedLocationId)
  ) {
    return requestedLocationId
  }
  return branches.length === 1 ? (branches[0]?.id ?? null) : null
}

async function SalesPageData({ requestedLocationId }: { requestedLocationId: number | null }) {
  const t = await getTranslations('analytics.sales')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocationsListData(userId)
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  const hasBranches = branches.length > 0

  if (!hasBranches) {
    return (
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="text-lg font-medium">{t('noBranches.title')}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t('noBranches.description')}
        </p>
        <Button asChild size="lg">
          <Link href={routes.analytics.branchesCreate}>{t('noBranches.cta')}</Link>
        </Button>
      </section>
    )
  }

  const initialLocationId = resolveInitialLocationId(branches, requestedLocationId)
  const initialAnalytics =
    initialLocationId === null
      ? []
      : await getCachedAnalyticsRunsByLocation(userId, initialLocationId)

  return (
    <section className="space-y-3">
      <AnalyticsSalesClient
        branches={branches}
        initialLocationId={initialLocationId}
        initialAnalytics={initialAnalytics}
      />
    </section>
  )
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const t = await getTranslations('analytics.sales')
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <PageHeading title={t('title')} description={t('description')} />
        <PosUploadInfoSection t={t} />
        <Suspense fallback={<SalesPageSkeleton />}>
          <SalesPageData requestedLocationId={requestedLocationId} />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
