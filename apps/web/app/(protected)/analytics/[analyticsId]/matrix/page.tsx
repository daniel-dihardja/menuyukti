import { auth } from '@clerk/nextjs/server'
import { Button } from '@workspace/ui/components/button'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedAnalyticsRun, getCachedMenuEngineeringMatrix } from '@/lib/graphql/cached-queries'
import { getAppCurrencyCode, getAppCurrencyLocale } from '@/lib/app-currency'
import { CreateWorkflowFromReportButton } from '@/components/create-workflow-from-report-button'
import { MatrixView } from './matrix-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const tSales = await getTranslations('analytics.sales')
  const tMatrix = await getTranslations('analytics.matrix')
  const tShared = await getTranslations('analytics.shared')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await getCachedAnalyticsRun(userId, id)
  const run = runData.analyticsRun
  if (!run) notFound()

  const matrixData = await getCachedMenuEngineeringMatrix(userId, id, String(run.locationId))

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`

  const matrix = matrixData.menuEngineeringMatrix
  const items = matrix?.items ?? []

  const locale = getAppCurrencyLocale()
  const currency = getAppCurrencyCode()

  return (
    <AnalyticsPageShell
      title={tMatrix('reportTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMatrix('breadcrumb') },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading title={tMatrix('heading')} description={tMatrix('description')} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
          <CreateWorkflowFromReportButton analyticsId={analyticsId} />
        </div>

        {!matrix ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No matrix data for this run.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No matrix data for this run.
          </div>
        ) : (
          <MatrixView items={items} locale={locale} currency={currency} />
        )}
      </section>
    </AnalyticsPageShell>
  )
}
