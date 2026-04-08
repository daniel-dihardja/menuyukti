export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATIONS_QUERY, type LocationsData } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { CampaignsClient } from './_components/campaigns-client'

function CampaignsListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-4 border-b pb-2">
            <Skeleton className="h-4 w-8 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-4 w-10 shrink-0" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div className="flex gap-4" key={`campaigns-skel-${i}`}>
              <Skeleton className="h-4 w-8 shrink-0" />
              <Skeleton className="h-4 min-w-0 flex-1" />
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

async function CampaignsData() {
  const t = await getTranslations('analytics.campaigns')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId)
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
    nodeId: loc.nodeId,
  }))

  const hasBranches = branches.length > 0

  if (!hasBranches) {
    return (
      <Card className="flex flex-col gap-4 p-8 text-center">
        <h2 className="text-lg font-medium">{t('noBranches.title')}</h2>
        <p className="mx-auto max-w-md text-muted-foreground text-sm">
          {t('noBranches.description')}
        </p>
        <Button asChild size="lg">
          <Link href={routes.analytics.branchesCreate}>{t('noBranches.cta')}</Link>
        </Button>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <CampaignsClient branches={branches} />
    </section>
  )
}

export default async function Page() {
  const t = await getTranslations('analytics.campaigns')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading
        description={t('description')}
        descriptionClassName="text-pretty"
        title={t('title')}
        titleClassName="text-balance"
      />
      <Suspense fallback={<CampaignsListSkeleton />}>
        <CampaignsData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
