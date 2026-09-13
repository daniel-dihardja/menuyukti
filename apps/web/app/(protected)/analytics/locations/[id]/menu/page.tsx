import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getAppCurrencyCode } from '@/lib/app-currency'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_MENU_QUERY, type LocationMenuData } from '@/lib/graphql/queries/location-menu'
import { routes } from '@/lib/routes'

import { LocationMenuForm } from './location-menu-form'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('analytics.locationMenu')
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

  const [locationData, menuData] = await Promise.all([
    getCachedLocation(userId, id),
    graphqlQuery<LocationMenuData>(LOCATION_MENU_QUERY, { locationId }, userId, 'LocationMenu'),
  ])

  const location = locationData.location
  if (!location) notFound()

  const t = await getTranslations('analytics.locationMenu')
  const tBranches = await getTranslations('analytics.branches')
  const appCurrency = getAppCurrencyCode()
  const currencyCode = (location.currency?.trim() || appCurrency).toUpperCase() || appCurrency

  const initialCategories =
    menuData.locationMenu?.categories.map((category) => ({
      key: `cat-${category.id}`,
      name: category.name,
      items:
        category.items.length > 0
          ? category.items.map((item) => ({
              key: `item-${item.id}`,
              name: item.name,
              price: String(item.price),
              description: item.description ?? '',
              imageFilename: item.imageFilename ?? null,
            }))
          : [
              {
                key: `item-empty-${category.id}`,
                name: '',
                price: '',
                description: '',
                imageFilename: null,
              },
            ],
    })) ?? []

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
        <LocationMenuForm
          locationId={locationId}
          currencyCode={currencyCode}
          initialCategories={initialCategories}
        />
      </section>
    </AnalyticsPageShell>
  )
}
