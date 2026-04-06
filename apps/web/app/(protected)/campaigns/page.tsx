export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATIONS_QUERY, type LocationsData } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { CampaignsClient } from './_components/campaigns-client'

function CampaignsListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  )
}

async function CampaignsData() {
  const t = await getTranslations('analytics.campaigns')
  const { userId } = await auth()
  if (!userId) {
    redirect(routes.login)
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
      <Card className="space-y-4 p-8 text-center">
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
    <section className="space-y-3">
      <CampaignsClient branches={branches} />
    </section>
  )
}

export default async function Page() {
  const t = await getTranslations('analytics.campaigns')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading description={t('description')} title={t('title')} />
      <Suspense fallback={<CampaignsListSkeleton />}>
        <CampaignsData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
