export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  LOCATIONS_QUERY,
  NODES_QUERY,
  parseNodesData,
  type LocationsData,
  type NodesDataRaw,
} from '@/lib/graphql/queries'
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
import { DashboardRecentAssets } from './_components/dashboard-recent-assets'

type CampaignRow = {
  id: string
  name: string
  locationName: string
}

export default async function Page() {
  const t = await getTranslations('platform.dashboard')
  const { userId } = await auth()
  if (!userId) {
    redirect(routes.login)
  }

  const locationsData = await graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId)
  const campaignRows: CampaignRow[] = []

  await Promise.all(
    locationsData.locations.map(async (loc) => {
      const raw = await graphqlQuery<NodesDataRaw>(
        NODES_QUERY,
        { locationId: Number(loc.id), nodeType: 'campaign' },
        userId,
      )
      const { nodes } = parseNodesData(raw)
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
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <PageHeading description={t('description')} title={t('title')} />

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-semibold text-lg">{t('campaignsHeading')}</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.campaigns.list}>{t('campaignsViewAll')}</Link>
            </Button>
          </div>
          {campaignRows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col gap-3 py-8">
                <p className="text-center text-muted-foreground">{t('noCampaigns')}</p>
                <Button asChild className="self-center">
                  <Link href={routes.campaigns.list}>{t('createCampaign')}</Link>
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
                        <Link href={routes.campaigns.detail(c.id)}>{t('viewCampaign')}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

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

        <section className="grid gap-4 md:grid-cols-2">
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
          <Card>
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
    </AnalyticsPageShell>
  )
}
