import { auth } from '@clerk/nextjs/server'
import { Grid3x3 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedAnalyticsRun, getCachedMenuEngineeringMatrix } from '@/lib/graphql/cached-queries'
import { getAppCurrencyCode, getAppCurrencyLocale } from '@/lib/app-currency'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { formatPreviewDateString } from '@/lib/format-preview-date'
import { CreateWorkflowFromReportButton } from '@/components/create-workflow-from-report-button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { cn } from '@workspace/ui/lib/utils'
import { MatrixView } from './matrix-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

function formatReportPeriod(
  periodStart: string | null,
  periodEnd: string | null,
  locale: string,
): string | null {
  if (periodStart && periodEnd) {
    return `${formatPreviewDateString(periodStart, locale)} – ${formatPreviewDateString(periodEnd, locale)}`
  }
  if (periodStart) return formatPreviewDateString(periodStart, locale)
  if (periodEnd) return formatPreviewDateString(periodEnd, locale)
  return null
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

  const locationId = String(run.locationId)
  const matrixData = await getCachedMenuEngineeringMatrix(userId, id, locationId)

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`
  const matrix = matrixData.menuEngineeringMatrix
  const items = matrix?.items ?? []
  const distribution = matrix?.distribution ?? []
  const thresholds = matrix?.thresholds

  const locale = getAppCurrencyLocale()
  const currency = getAppCurrencyCode()
  const reportPeriod = formatReportPeriod(run.periodStart, run.periodEnd, locale)
  const showFilename = run.filename && run.filename !== analyticsName

  return (
    <AnalyticsPageShell
      title={tMatrix('reportTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMatrix('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3">
          <PageHeading title={tMatrix('heading')} description={tMatrix('description')} />
          <div className="flex flex-wrap items-center gap-2">
            {run.posSystem ? (
              <Badge variant="outline">
                {tMatrix('reportPos')}: {run.posSystem}
              </Badge>
            ) : null}
            {reportPeriod ? (
              <Badge variant="secondary">
                {tMatrix('reportPeriod')}: {reportPeriod}
              </Badge>
            ) : null}
          </div>
          {showFilename ? <p className="text-sm text-muted-foreground">{run.filename}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.heatmap(analyticsId)}>{tMatrix('links.heatmap')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.menuCombos(analyticsId)}>
              {tMatrix('links.menuCombos')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.cogs(analyticsId)}>{tMatrix('links.cogs')}</Link>
          </Button>
          <CreateWorkflowFromReportButton analyticsId={analyticsId} />
        </div>

        {!matrix || items.length === 0 || !thresholds ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Grid3x3 aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{tMatrix('empty.title')}</EmptyTitle>
              <EmptyDescription>{tMatrix('empty.description')}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm">
                <Link href={routes.analytics.cogs(analyticsId)}>{tMatrix('empty.cta')}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <MatrixView
            items={items}
            distribution={distribution}
            thresholds={thresholds}
            locale={locale}
            currency={currency}
          />
        )}
      </section>
    </AnalyticsPageShell>
  )
}
