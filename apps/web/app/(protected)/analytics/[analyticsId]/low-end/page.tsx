import { auth } from '@clerk/nextjs/server'
import { CircleOff } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { routes } from '@/lib/routes'
import { notFound } from 'next/navigation'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedAnalyticsRun, getCachedMenuEngineeringMatrix } from '@/lib/graphql/cached-queries'
import { getAppCurrencyCode, getAppCurrencyLocale } from '@/lib/app-currency'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { formatPreviewDateString } from '@/lib/format-preview-date'
import { Badge } from '@workspace/ui/components/badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'
import { Suspense } from 'react'
import { LowEndView } from '@/components/analytics/low-end/low-end-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.lowEnd')
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

function LowEndReportSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`kpi-${index}`} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="min-h-[24rem] w-full rounded-lg" />
    </>
  )
}

async function LowEndReportContent({
  analyticsId,
  userId,
  periodStart,
  periodEnd,
}: {
  analyticsId: number
  userId: string
  periodStart: string | null
  periodEnd: string | null
}) {
  const tLowEnd = await getTranslations('analytics.lowEnd')
  const id = String(analyticsId)
  const matrixData = await getCachedMenuEngineeringMatrix(userId, id)
  const matrix = matrixData.menuEngineeringMatrix
  const items = matrix?.items ?? []
  const distribution = matrix?.distribution ?? []
  const locale = getAppCurrencyLocale()
  const currency = getAppCurrencyCode()

  if (!matrix || items.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleOff aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{tLowEnd('empty.title')}</EmptyTitle>
          <EmptyDescription>{tLowEnd('empty.description')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm">
            <Link href={routes.analytics.cogs(analyticsId)}>{tLowEnd('empty.cta')}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <LowEndView
      items={items}
      distribution={distribution}
      periodStart={periodStart}
      periodEnd={periodEnd}
      locale={locale}
      currency={currency}
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const tSales = await getTranslations('analytics.sales')
  const tLowEnd = await getTranslations('analytics.lowEnd')
  const tShared = await getTranslations('analytics.shared')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await getCachedAnalyticsRun(userId, id)
  const run = runData.analyticsRun
  if (!run) notFound()

  const salesHref = routes.analytics.salesWithLocation(run.locationId)

  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`
  const locale = getAppCurrencyLocale()
  const reportPeriod = formatReportPeriod(run.periodStart, run.periodEnd, locale)
  const showFilename = run.filename && run.filename !== analyticsName

  return (
    <AnalyticsPageShell
      title={tLowEnd('reportTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: salesHref },
        { label: analyticsName },
        { label: tLowEnd('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3">
          <PageHeading title={tLowEnd('heading')} description={tLowEnd('description')} />
          <div className="flex flex-wrap items-center gap-2">
            {run.posSystem ? (
              <Badge variant="outline">
                {tLowEnd('reportPos')}: {run.posSystem}
              </Badge>
            ) : null}
            {reportPeriod ? (
              <Badge variant="secondary">
                {tLowEnd('reportPeriod')}: {reportPeriod}
              </Badge>
            ) : null}
          </div>
          {showFilename ? <p className="text-sm text-muted-foreground">{run.filename}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={salesHref}>{tShared('backToSales')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.matrix(analyticsId)}>{tLowEnd('links.matrix')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.cogs(analyticsId)}>{tLowEnd('links.cogs')}</Link>
          </Button>
        </div>

        <Suspense fallback={<LowEndReportSkeleton />}>
          <LowEndReportContent
            analyticsId={analyticsId}
            userId={userId}
            periodStart={run.periodStart}
            periodEnd={run.periodEnd}
          />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
