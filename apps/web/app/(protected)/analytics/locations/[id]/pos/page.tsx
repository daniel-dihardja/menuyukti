import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getAppCurrencyCode } from '@/lib/app-currency'
import { requireWorkspaceMediaAccess } from '@/lib/assets/workspace-media-access'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_MENU_QUERY, type LocationMenuData } from '@/lib/graphql/queries/location-menu'
import { POS_ORDERS_QUERY, type PosOrdersData } from '@/lib/graphql/queries/pos-orders'
import { presignPhotoUrlsForAccess } from '@/lib/media/presign-photo-urls'
import { routes } from '@/lib/routes'

import { PosCashier } from './pos-cashier'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('pos')
  const description = t('description')
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('title'), description, openGraph: { title: t('title'), description } }
  }
  const data = await getCachedLocation(userId, id)
  const title = data.location ? `${data.location.name} · ${t('title')}` : t('title')
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

  const [locationData, menuData, ordersData] = await Promise.all([
    getCachedLocation(userId, id),
    graphqlQuery<LocationMenuData>(LOCATION_MENU_QUERY, { locationId }, userId, 'LocationMenu'),
    graphqlQuery<PosOrdersData>(POS_ORDERS_QUERY, { locationId }, userId, 'PosOrders'),
  ])

  const location = locationData.location
  if (!location) notFound()

  const menu = menuData.locationMenu
  const imageFilenames = [
    ...new Set(
      (menu?.categories ?? []).flatMap((category) =>
        category.items
          .map((item) => item.imageFilename?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ),
  ]
  let itemImageUrls: Record<string, string> = {}
  if (imageFilenames.length > 0) {
    const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
    if (mediaAccess.ok) {
      itemImageUrls = await presignPhotoUrlsForAccess(mediaAccess.access, imageFilenames)
    }
  }

  const t = await getTranslations('pos')
  const tBranches = await getTranslations('analytics.branches')
  const appCurrency = getAppCurrencyCode()
  const currencyCode = (location.currency?.trim() || appCurrency).toUpperCase() || appCurrency

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[
        { label: tBranches('title'), href: routes.analytics.branches },
        { label: location.name, href: routes.analytics.branchesDetail(location.id) },
        { label: t('title') },
      ]}
      contentWidth="full"
      mainClassName="gap-0 px-0 py-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden"
    >
      <section className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)] lg:gap-3 lg:overflow-hidden lg:p-4">
        <PosCashier
          locationId={locationId}
          locationName={location.name}
          currencyCode={currencyCode}
          initialMenu={menu}
          initialOrders={ordersData.posOrders}
          itemImageUrls={itemImageUrls}
        />
      </section>
    </AnalyticsPageShell>
  )
}
