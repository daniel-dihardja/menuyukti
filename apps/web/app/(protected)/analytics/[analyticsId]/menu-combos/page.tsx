import { auth } from '@clerk/nextjs/server'
import { Link2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getAppCurrencyLocale } from '@/lib/app-currency'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { formatPreviewDateString } from '@/lib/format-preview-date'
import {
  getCachedAnalyticsRun,
  getCachedMenuCombos,
  getCachedMenuEngineeringMatrix,
} from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { MenuCombosView } from './menu-combos-view'

type PageProps = {
  params: Promise<{ analyticsId?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.menuCombos')
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

function MenuCombosReportSkeleton() {
  return <Skeleton className="min-h-[24rem] w-full rounded-lg" />
}

async function MenuCombosReportContent({
  analyticsId,
  userId,
  locationId,
}: {
  analyticsId: number
  userId: string
  locationId: string
}) {
  const tMenuCombos = await getTranslations('analytics.menuCombos')
  const tShared = await getTranslations('analytics.shared')
  const locale = getAppCurrencyLocale()
  const id = String(analyticsId)

  const [combosData, matrixData] = await Promise.all([
    getCachedMenuCombos(userId, id, locationId),
    getCachedMenuEngineeringMatrix(userId, id, locationId),
  ])

  const menuCombos = combosData.menuCombos
  const matrixAvailable =
    matrixData.menuEngineeringMatrix != null && matrixData.menuEngineeringMatrix.items.length > 0

  if (!menuCombos) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Link2 aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{tMenuCombos('empty.title')}</EmptyTitle>
          <EmptyDescription>{tMenuCombos('empty.description')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <MenuCombosView
      analyticsId={analyticsId}
      menuCombos={menuCombos}
      locale={locale}
      matrixAvailable={matrixAvailable}
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const tSales = await getTranslations('analytics.sales')
  const tMenuCombos = await getTranslations('analytics.menuCombos')
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
  const analyticsName = run.name ?? run.filename ?? `Analytics #${run.id}`
  const reportPeriod = formatReportPeriod(run.periodStart, run.periodEnd, locale)
  const showFilename = run.filename && run.filename !== analyticsName

  return (
    <AnalyticsPageShell
      title={tMenuCombos('reportTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMenuCombos('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3">
          <PageHeading title={tMenuCombos('heading')} description={tMenuCombos('description')} />
          <div className="flex flex-wrap items-center gap-2">
            {run.posSystem ? (
              <Badge variant="outline">
                {tMenuCombos('reportPos')}: {run.posSystem}
              </Badge>
            ) : null}
            {reportPeriod ? (
              <Badge variant="secondary">
                {tMenuCombos('reportPeriod')}: {reportPeriod}
              </Badge>
            ) : null}
          </div>
          {showFilename ? <p className="text-sm text-muted-foreground">{run.filename}</p> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={routes.analytics.sales}>{tShared('backToSales')}</Link>
          </Button>
        </div>

        <Suspense fallback={<MenuCombosReportSkeleton />}>
          <MenuCombosReportContent
            analyticsId={analyticsId}
            userId={userId}
            locationId={locationId}
          />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
