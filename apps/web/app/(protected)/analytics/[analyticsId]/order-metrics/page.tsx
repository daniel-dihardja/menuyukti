import { auth } from '@clerk/nextjs/server'
import { BarChart3 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { CreateWorkflowFromReportButton } from '@/components/create-workflow-from-report-button'
import { PageHeading } from '@/components/page-heading'
import { getAppCurrencyCode, getAppCurrencyLocale } from '@/lib/app-currency'
import { formatPreviewDateString } from '@/lib/format-preview-date'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedAnalyticsRun, getCachedOrderMetrics } from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'
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

import { OrderMetricsView } from './_components/order-metrics-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.orderMetrics')
  const title = t('reportTitle')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
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
  const tOrderMetrics = await getTranslations('analytics.orderMetrics')
  const tShared = await getTranslations('analytics.shared')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const [runData, orderMetricsData] = await Promise.all([
    getCachedAnalyticsRun(userId, id),
    getCachedOrderMetrics(userId, id),
  ])

  const run = runData.analyticsRun
  if (!run) notFound()

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`
  const orderMetrics = orderMetricsData.orderMetrics
  const locale = getAppCurrencyLocale()
  const currency = getAppCurrencyCode()
  const reportPeriod = formatReportPeriod(run.periodStart, run.periodEnd, locale)
  const showFilename = run.filename && run.filename !== analyticsName

  return (
    <AnalyticsPageShell
      title={tOrderMetrics('reportTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tOrderMetrics('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3">
          <PageHeading
            title={tOrderMetrics('heading')}
            description={tOrderMetrics('description')}
          />
          <div className="flex flex-wrap items-center gap-2">
            {run.posSystem ? (
              <Badge variant="outline">
                {tOrderMetrics('reportPos')}: {run.posSystem}
              </Badge>
            ) : null}
            {reportPeriod ? (
              <Badge variant="secondary">
                {tOrderMetrics('reportPeriod')}: {reportPeriod}
              </Badge>
            ) : null}
          </div>
          {showFilename ? <p className="text-sm text-muted-foreground">{run.filename}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
          <CreateWorkflowFromReportButton analyticsId={analyticsId} />
        </div>

        {!orderMetrics ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{tOrderMetrics('emptyTitle')}</EmptyTitle>
              <EmptyDescription>{tOrderMetrics('emptyDescription')}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline" size="sm">
                <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <OrderMetricsView
            avgOrderSize={orderMetrics.avgOrderSize}
            avgOrderRevenue={orderMetrics.avgOrderRevenue}
            slotDemandProfile={orderMetrics.slotDemandProfile}
            locale={locale}
            currency={currency}
          />
        )}
      </section>
    </AnalyticsPageShell>
  )
}
