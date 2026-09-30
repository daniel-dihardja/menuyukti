import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DigitalMenuConsole } from '@/app/(protected)/services/digital-menu/_components/digital-menu-console'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_MENU_QUERY, type LocationMenuData } from '@/lib/graphql/queries/location-menu'
import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ locationId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('services.digitalMenu.console')
  const description = t('description')
  const { locationId } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('heading'), description, openGraph: { title: t('heading'), description } }
  }
  const data = await getCachedLocation(userId, locationId)
  const title = data.location ? `${data.location.name} · ${t('heading')}` : t('heading')
  return { title, description, openGraph: { title, description } }
}

export default async function DigitalMenuConsolePage({ params }: PageProps) {
  const { locationId: locationIdParam } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(locationIdParam)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, menuData, tServices, tDigital, tConsole] = await Promise.all([
    getCachedLocation(userId, locationIdParam),
    graphqlQuery<LocationMenuData>(LOCATION_MENU_QUERY, { locationId }, userId, 'LocationMenu'),
    getTranslations('services'),
    getTranslations('services.digitalMenu'),
    getTranslations('services.digitalMenu.console'),
  ])

  const location = locationData.location
  if (!location) notFound()

  return (
    <AnalyticsPageShell
      title={tConsole('heading')}
      breadcrumbs={[
        { label: tServices('title'), href: routes.services },
        { label: tDigital('title'), href: routes.servicesDigitalMenu },
        { label: location.name },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={LOCATION_DETAIL_SECTION_CLASS}>
        <DigitalMenuConsole
          locationId={locationId}
          locationName={location.name}
          initialPublicEnabled={menuData.locationMenu?.publicEnabled ?? false}
          initialPublicSlug={location.publicSlug ?? ''}
          initialHeaderImageFilename={menuData.locationMenu?.headerImageFilename ?? null}
        />
      </section>
    </AnalyticsPageShell>
  )
}
