export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@workspace/ui/components/button'
import Link from 'next/link'
import { routes } from '@/lib/routes'
import { LocationsTable } from './locations-table'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATIONS_QUERY, type LocationsData } from '@/lib/graphql/queries'
import { Skeleton } from '@workspace/ui/components/skeleton'

function LocationsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start">
        <Skeleton className="h-10 w-full max-w-xs sm:w-40" />
      </div>
      <div className="w-full border">
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
  const { userId } = await auth()
  if (!userId) {
    redirect(routes.login)
  }

  const data = await graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId)
  const branches = data.locations

  return (
    <>
      <div className="flex justify-start">
        <Button asChild className="w-full sm:w-auto">
          <Link href={routes.analytics.branchesCreate}>{t('create')}</Link>
        </Button>
      </div>

      <LocationsTable
        branches={branches}
        indexLabel={t('table.index')}
        branchNameLabel={t('table.branchName')}
        emptyLabel={t('table.empty')}
      />
    </>
  )
}

export default async function Page() {
  const t = await getTranslations('analytics.branches')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading title={t('title')} description={t('description')} />
      <Suspense fallback={<LocationsPageSkeleton />}>
        <LocationsPageData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
