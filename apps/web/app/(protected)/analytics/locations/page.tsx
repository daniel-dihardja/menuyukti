import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@workspace/ui/components/button'
import Link from 'next/link'
import { routes } from '@/lib/routes'
import { LocationsTable } from './locations-table'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { auth } from '@clerk/nextjs/server'
import {
  getCachedAnalyticsRunsByLocation,
  getCachedLocationsData,
} from '@/lib/graphql/cached-queries'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { cn } from '@workspace/ui/lib/utils'

function LocationsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-full max-w-xs sm:w-40" />
      </div>
      <div className="-mx-4 w-[calc(100%+2rem)] border-x-0 border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
        <div className="flex gap-4 border-b px-4 py-3">
          <Skeleton className="h-4 w-8 shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            className="flex gap-4 border-b px-4 py-3 last:border-b-0"
            key={`locations-skel-${i}`}
          >
            <Skeleton className="h-4 w-8 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1 max-w-xs" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function LocationsPageData() {
  const t = await getTranslations('analytics.branches')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocationsData(userId)
  const branches = await Promise.all(
    data.locations.map(async (location) => {
      const runs = await getCachedAnalyticsRunsByLocation(userId, Number(location.id))
      return {
        ...location,
        analyticsRunCount: runs.length,
        latestAnalyticsId: runs[0]?.id ?? null,
      }
    }),
  )

  return (
    <LocationsTable
      branches={branches}
      createHref={routes.analytics.branchesCreate}
      indexLabel={t('table.index')}
      branchNameLabel={t('table.branchName')}
    />
  )
}

export default async function Page() {
  const t = await getTranslations('analytics.branches')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeading title={t('title')} description={t('description')} />
          <Button asChild className="w-full shrink-0 sm:w-auto" size="sm">
            <Link href={routes.analytics.branchesCreate}>{t('create')}</Link>
          </Button>
        </div>
        <Suspense fallback={<LocationsPageSkeleton />}>
          <LocationsPageData />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
