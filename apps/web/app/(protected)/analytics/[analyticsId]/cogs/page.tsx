import { auth } from '@clerk/nextjs/server'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { UpdateCogsForm } from './update-cogs-form'
import { getAppCurrencyCode } from '@/lib/app-currency'
import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  getCachedAnalyticsRunsByLocation,
  getCachedMenuEngineeringMatrix,
} from '@/lib/graphql/cached-queries'
import {
  ANALYTICS_RUN_QUERY,
  MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
  type AnalyticsRunData,
  type MenuItemsCatalogForRunData,
} from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'

type PageProps = {
  params: Promise<{
    analyticsId?: string
  }>
}

type AnalyticsRun = NonNullable<AnalyticsRunData['analyticsRun']>

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics.cogs')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

function CogsReportSkeleton() {
  return <Skeleton className="min-h-[24rem] w-full rounded-lg" />
}

async function CogsReportContent({
  analyticsId,
  userId,
  run,
}: {
  analyticsId: number
  userId: string
  run: AnalyticsRun
}) {
  const id = String(analyticsId)
  const locationId = String(run.locationId)
  const [matrixData, menuCatalogData] = await Promise.all([
    getCachedMenuEngineeringMatrix(userId, id, locationId),
    graphqlQuery<MenuItemsCatalogForRunData>(
      MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
      { analyticsRunId: id },
      userId,
      'MenuItemsCatalogForRun',
    ),
  ])

  const currencyCode = getAppCurrencyCode()

  const byMenu = new Map(
    matrixData.menuEngineeringMatrix?.items.map((row) => [
      row.menu,
      {
        menuName: row.menu,
        quantity: row.quantity,
        totalRevenue: row.totalRevenue,
        price: row.quantity > 0 ? row.totalRevenue / row.quantity : 0,
        menuCategory: row.menuCategory ?? null,
      },
    ]) ?? [],
  )

  const cogsByMenu = new Map(run.menuItemCogs.map((cog) => [cog.menu, cog]))

  let menuItems = Array.from(byMenu.values())
    .map((row, index) => {
      const existing = cogsByMenu.get(row.menuName)
      return {
        id: existing?.id ?? -(index + 1),
        menuName: row.menuName,
        cogs: existing?.cogs ?? null,
        quantity: row.quantity,
        totalRevenue: row.totalRevenue,
        price: row.price,
        menuCategory: existing?.menuCategory ?? row.menuCategory,
      }
    })
    .concat(
      run.menuItemCogs
        .filter((cog) => !byMenu.has(cog.menu))
        .map((cog) => ({
          id: cog.id,
          menuName: cog.menu,
          cogs: cog.cogs,
          quantity: 0,
          totalRevenue: 0,
          price: 0,
          menuCategory: cog.menuCategory ?? null,
        })),
    )
  if (menuItems.length === 0) {
    const payload = menuCatalogData.menuItemsCatalogForRun
    if (payload && payload.analyticsRunId === id) {
      menuItems = payload.items.map((item, index) => {
        const parsedId = Number(item.id)
        return {
          id: Number.isFinite(parsedId) ? parsedId : -(index + 1),
          menuName: item.name,
          cogs: cogsByMenu.get(item.name)?.cogs ?? null,
          quantity: item.quantity,
          totalRevenue: item.price * item.quantity,
          price: item.price,
          menuCategory: item.category || null,
        }
      })
    }
  }
  menuItems = menuItems.toSorted((a, b) => a.menuName.localeCompare(b.menuName))

  const otherRuns = await getCachedAnalyticsRunsByLocation(userId, Number(locationId))
  const analyticsOptions = otherRuns.filter((option) => option.id !== analyticsId)

  return (
    <UpdateCogsForm
      analyticsId={analyticsId}
      locationId={Number(locationId)}
      menuItems={menuItems}
      analyticsOptions={analyticsOptions}
      currencyCode={currencyCode}
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const t = await getTranslations('analytics')
  const tSales = await getTranslations('analytics.sales')

  const { analyticsId: analyticsIdParam } = await params
  if (!analyticsIdParam) notFound()

  const analyticsId = Number(analyticsIdParam)
  if (!Number.isInteger(analyticsId)) notFound()

  const id = String(analyticsId)
  const runData = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, { id }, userId)
  const run = runData.analyticsRun
  if (!run) notFound()

  const analyticsName = run.name ?? run.filename ?? `Analytics #${analyticsId}`

  return (
    <AnalyticsPageShell
      title={t('cogs.edit')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: t('cogs.title') },
      ]}
    >
      <Suspense fallback={<CogsReportSkeleton />}>
        <CogsReportContent analyticsId={analyticsId} run={run} userId={userId} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
