import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { UpdateCogsForm } from './update-cogs-form'
import { getAppCurrencyCode } from '@/lib/app-currency'
import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import { getCachedMenuEngineeringMatrix } from '@/lib/graphql/cached-queries'
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

  const matrixData = await getCachedMenuEngineeringMatrix(userId, id, String(run.locationId))
  const menuCatalogData = await graphqlQuery<MenuItemsCatalogForRunData>(
    MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
    { analyticsRunId: id },
    userId,
    'MenuItemsCatalogForRun',
  )

  const analyticsName = run.name ?? run.filename ?? `Analytics #${analyticsId}`
  const currencyCode = getAppCurrencyCode()

  // Seed rows from matrix items (sales-extracted menus), then overlay existing COGS.
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
        // Use stable synthetic negative IDs for rows that do not exist in menu_item_cogs yet.
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
  menuItems = menuItems.sort((a, b) => a.menuName.localeCompare(b.menuName))

  const analyticsOptions: Array<{ id: number; name: string }> = []

  return (
    <AnalyticsPageShell
      title={t('cogs.edit')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: analyticsName },
        { label: t('cogs.title') },
      ]}
    >
      <UpdateCogsForm
        analyticsId={analyticsId}
        menuItems={menuItems}
        analyticsOptions={analyticsOptions}
        currencyCode={currencyCode}
      />
    </AnalyticsPageShell>
  )
}
