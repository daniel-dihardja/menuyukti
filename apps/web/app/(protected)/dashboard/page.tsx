import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'

import { routes } from '@/lib/routes'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'
import { getCachedLocationsData, getCachedWorkflowsByLocation } from '@/lib/graphql/cached-queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { DashboardRecentAssets } from './_components/dashboard-recent-assets'

type CampaignRow = {
  id: string
  name: string
  locationName: string
}

function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={`dash-campaign-skel-${i}`}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="mt-2 h-4 w-3/5" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-24" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              className="h-28 w-[calc(50%-0.375rem)] min-w-[140px] flex-1 rounded-lg sm:w-[calc(33.333%-0.5rem)]"
              key={`dash-asset-skel-${i}`}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-full max-w-sm" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-36" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-2 h-4 w-full max-w-sm" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

async function DashboardPageData() {
  const t = await getTranslations('platform.dashboard')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const platformRole = await resolveMenuyuktiRole()
  const isPlatformAdmin = isMenuyuktiAdmin(platformRole)

  const locationsData = await getCachedLocationsData(userId)
  const campaignRows: CampaignRow[] = []

  await Promise.all(
    locationsData.locations.map(async (loc) => {
      const nodes = await getCachedWorkflowsByLocation(userId, Number(loc.id))
      for (const n of nodes) {
        campaignRows.push({
          id: n.id,
          name: n.name,
          locationName: loc.name,
        })
      }
    }),
  )

  campaignRows.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-semibold text-lg">{t('campaignsHeading')}</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.workflows.list}>{t('campaignsViewAll')}</Link>
          </Button>
        </div>
        {campaignRows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-3 py-8">
              <p className="text-center text-muted-foreground">{t('noCampaigns')}</p>
              <Button asChild className="self-center">
                <Link href={routes.workflows.list}>{t('createCampaign')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaignRows.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-base">{c.name}</CardTitle>
                    <CardDescription>
                      {t('branchLabel')}: {c.locationName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={routes.workflows.detail(c.id)}>{t('viewCampaign')}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isPlatformAdmin ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-lg">{t('assetsHeading')}</h2>
              <p className="text-muted-foreground text-sm">{t('assetsDescription')}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.studio}>{t('assetsOpenStudio')}</Link>
            </Button>
          </div>
          <DashboardRecentAssets />
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {isPlatformAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('printHeading')}</CardTitle>
              <CardDescription>{t('printDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={routes.printOrders}>{t('printViewOrders')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <Card className={isPlatformAdmin ? '' : 'md:col-span-2'}>
          <CardHeader>
            <CardTitle>{t('insightsHeading')}</CardTitle>
            <CardDescription>{t('insightsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={routes.analytics.sales}>{t('insightsCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default async function Page() {
  const t = await getTranslations('platform.dashboard')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading description={t('description')} title={t('title')} />
      <Suspense fallback={<DashboardPageSkeleton />}>
        <DashboardPageData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
