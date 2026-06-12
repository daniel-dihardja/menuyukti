import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Button } from '@workspace/ui/components/button'
import Link from 'next/link'
import {
  getCachedAnalyticsRun,
  getCachedMenuEngineeringMatrix,
  getCachedMenuHeatmaps,
} from '@/lib/graphql/cached-queries'
import { getAppCurrencyLocale } from '@/lib/app-currency'
import { CreateWorkflowFromReportButton } from '@/components/create-workflow-from-report-button'
import { HeatmapView } from './heatmap-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const tSales = await getTranslations('analytics.sales')
  const tHeatmap = await getTranslations('analytics.heatmap')
  const tShared = await getTranslations('analytics.shared')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await getCachedAnalyticsRun(userId, id)
  const run = runData.analyticsRun
  if (!run) notFound()

  const locationId = String(run.locationId)
  const locale = getAppCurrencyLocale()
  const [heatmapsData, matrixData] = await Promise.all([
    getCachedMenuHeatmaps(userId, id, locationId),
    getCachedMenuEngineeringMatrix(userId, id, locationId),
  ])

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`
  const menuHeatmaps = heatmapsData.menuHeatmaps ?? []
  const matrixItems = matrixData.menuEngineeringMatrix?.items ?? null

  return (
    <AnalyticsPageShell
      title={tHeatmap('reportTitle')}
      contentWidth="full"
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tHeatmap('breadcrumb') },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading title={tHeatmap('heading')} description={tHeatmap('description')} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
          <CreateWorkflowFromReportButton analyticsId={analyticsId} />
        </div>

        <HeatmapView menuHeatmaps={menuHeatmaps} matrixItems={matrixItems} locale={locale} />
      </section>
    </AnalyticsPageShell>
  )
}
