import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { DigitalMenuPdpClient } from '@/app/(protected)/services/digital-menu/_components/digital-menu-pdp-client'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_MENU_QUERY, type LocationMenuData } from '@/lib/graphql/queries/location-menu'
import { routes } from '@/lib/routes'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('services.digitalMenu')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function DigitalMenuServicePage() {
  const tServices = await getTranslations('services')
  const t = await getTranslations('services.digitalMenu')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationsData = await getCachedLocationsListData(userId)
  const locations = locationsData.locations
    .map((location) => {
      const id = Number(location.id)
      if (!Number.isInteger(id) || id < 1) return null
      return { id, name: location.name }
    })
    .filter((row): row is { id: number; name: string } => row != null)

  const connectedLocations = (
    await Promise.all(
      locations.map(async (location) => {
        const menuData = await graphqlQuery<LocationMenuData>(
          LOCATION_MENU_QUERY,
          { locationId: location.id },
          userId,
          'LocationMenu',
        )
        if (menuData.locationMenu?.publicEnabled !== true) return null
        return location
      }),
    )
  ).filter((row): row is { id: number; name: string } => row != null)

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: tServices('title'), href: routes.services }, { label: t('title') }]}
    >
      <DigitalMenuPdpClient locations={locations} connectedLocations={connectedLocations} />
    </AnalyticsPageShell>
  )
}
