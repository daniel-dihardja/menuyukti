import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getAppCurrencyCode } from '@/lib/app-currency'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedAnalyticsRunsByLocation, getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { MENU_ITEMS_CATALOG_QUERY, type MenuItemsCatalogData } from '@/lib/graphql/queries'
import { routes } from '@/lib/routes'

import { LocationCogsForm } from './location-cogs-form'

type PageProps = {
  params: Promise<{ id: string }>
}

const LOCATION_COGS_QUERY = `
  query LocationMenuItemCogsPage($locationId: ID!) {
    locationMenuItemCogs(locationId: $locationId) {
      id
      menu
      menuCategory
      cogs
    }
  }
`

type LocationCogsPageData = {
  locationMenuItemCogs: Array<{
    id: number
    menu: string
    menuCategory: string | null
    cogs: number
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('analytics.locationCogs')
  const description = t('description')
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('heading'), description, openGraph: { title: t('heading'), description } }
  }
  const data = await getCachedLocation(userId, id)
  const title = data.location ? `${data.location.name} · ${t('heading')}` : t('heading')
  return { title, description, openGraph: { title, description } }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(id)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, cogsData, analyticsOptions, catalogData] = await Promise.all([
    getCachedLocation(userId, id),
    graphqlQuery<LocationCogsPageData>(
      LOCATION_COGS_QUERY,
      { locationId: String(locationId) },
      userId,
      'LocationMenuItemCogsPage',
    ),
    getCachedAnalyticsRunsByLocation(userId, locationId),
    graphqlQuery<MenuItemsCatalogData>(
      MENU_ITEMS_CATALOG_QUERY,
      { locationId },
      userId,
      'MenuItemsCatalog',
    ),
  ])

  const location = locationData.location
  if (!location) notFound()

  const t = await getTranslations('analytics.locationCogs')
  const tBranches = await getTranslations('analytics.branches')
  const appCurrency = getAppCurrencyCode()
  const currencyCode = (location.currency?.trim() || appCurrency).toUpperCase() || appCurrency

  const cogsByMenu = new Map(
    cogsData.locationMenuItemCogs.map((row) => [row.menu.toLowerCase(), row]),
  )

  const catalogItems = catalogData.menuItemsCatalog?.items ?? []
  const menuItems =
    cogsData.locationMenuItemCogs.length > 0
      ? cogsData.locationMenuItemCogs.map((row) => ({
          id: row.id,
          menuName: row.menu,
          cogs: row.cogs,
          menuCategory: row.menuCategory,
        }))
      : catalogItems.map((item, index) => {
          const existing = cogsByMenu.get(item.name.toLowerCase())
          const parsedId = Number(item.id)
          return {
            id: existing?.id ?? (Number.isFinite(parsedId) ? parsedId : -(index + 1)),
            menuName: item.name,
            cogs: existing?.cogs ?? null,
            menuCategory: existing?.menuCategory ?? item.category ?? null,
          }
        })

  return (
    <AnalyticsPageShell
      title={t('heading')}
      breadcrumbs={[
        { label: tBranches('title'), href: routes.analytics.branches },
        { label: location.name, href: routes.analytics.branchesDetail(location.id) },
        { label: t('heading') },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={LOCATION_DETAIL_SECTION_CLASS}>
        <LocationCogsForm
          locationId={locationId}
          menuItems={menuItems}
          analyticsOptions={analyticsOptions}
          currencyCode={currencyCode}
        />
      </section>
    </AnalyticsPageShell>
  )
}
