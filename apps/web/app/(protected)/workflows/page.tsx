import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getCachedLocationsData } from '@/lib/graphql/cached-queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { CampaignsClient } from './_components/campaigns-client'

function CampaignsListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Card className="overflow-hidden border shadow-sm ring-1 ring-border/50">
        <CardHeader className="border-b bg-muted/20 px-5 py-5 sm:px-6">
          <Skeleton className="mb-2 h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="mt-1 h-4 w-full max-w-lg" />
        </CardHeader>
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full sm:col-span-2 lg:col-span-1" />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <Skeleton className="h-12 w-full max-w-md" />
            <Skeleton className="h-11 w-44 shrink-0" />
          </div>
        </div>
      </Card>
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

  const data = await getCachedLocationsData(userId)
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
    <section className="flex flex-col gap-6">
      <CampaignsClient branches={branches} />
    </section>
  )
}

export default async function Page() {
  const t = await getTranslations('analytics.campaigns')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <Suspense fallback={<CampaignsListSkeleton />}>
        <CampaignsData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
