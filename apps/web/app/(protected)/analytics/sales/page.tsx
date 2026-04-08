export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { auth } from '@clerk/nextjs/server'
import { getCachedLocationsData } from '@/lib/graphql/cached-queries'
import { AnalyticsSalesClient } from './analytics-sales-client'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'

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

async function SalesPageData() {
  const t = await getTranslations('analytics.sales')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocationsData(userId)
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  const hasBranches = branches.length > 0

  if (!hasBranches) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <h2 className="text-lg font-medium">{t('noBranches.title')}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t('noBranches.description')}
        </p>
        <Button asChild size="lg">
          <Link href={routes.analytics.branchesCreate}>{t('noBranches.cta')}</Link>
        </Button>
      </Card>
    )
  }

  return (
    <section className="space-y-3">
      <AnalyticsSalesClient branches={branches} />
    </section>
  )
}

export default async function Page() {
  const t = await getTranslations('analytics.sales')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading title={t('title')} description={t('description')} />
      <Suspense fallback={<SalesPageSkeleton />}>
        <SalesPageData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
