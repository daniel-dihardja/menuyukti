export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@workspace/ui/components/button'
import Link from 'next/link'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  ANALYTICS_RUN_QUERY,
  MENU_HEATMAPS_QUERY,
  type AnalyticsRunData,
  type MenuHeatmapsData,
} from '@/lib/graphql/queries'
import { DAILY_HEATMAP_END_HOUR, DAILY_HEATMAP_START_HOUR } from '@/lib/heatmap-config'
import { adaptDailyHeatmapMatrix, adaptWeeklyHeatmapMatrix } from './heatmap.adapters'
import { HeatmapView } from './heatmap-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export default async function Page({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) {
    notFound()
  }

  const tSales = await getTranslations('analytics.sales')
  const tHeatmap = await getTranslations('analytics.heatmap')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, { id }, userId)
  const run = runData.analyticsRun
  if (!run) notFound()

  const heatmapsData = await graphqlQuery<MenuHeatmapsData>(
    MENU_HEATMAPS_QUERY,
    { id, locationId: String(run.locationId) },
    userId,
  )

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`

  const menuHeatmaps = heatmapsData.menuHeatmaps ?? []
  const dailyMatrix = adaptDailyHeatmapMatrix(
    menuHeatmaps,
    DAILY_HEATMAP_START_HOUR,
    DAILY_HEATMAP_END_HOUR,
  )
  const weeklyMatrix = adaptWeeklyHeatmapMatrix(menuHeatmaps)

  return (
    <AnalyticsPageShell
      title={tHeatmap('reportTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tHeatmap('breadcrumb') },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading title={tHeatmap('heading')} description={tHeatmap('description')} />
        <Button asChild>
          <Link href={routes.analytics.sales}>Back to Sales</Link>
        </Button>
        <HeatmapView dailyMatrix={dailyMatrix} weeklyMatrix={weeklyMatrix} />
      </section>
    </AnalyticsPageShell>
  )
}
