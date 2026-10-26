import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import { OrderBoard } from '@/app/(protected)/services/digital-menu/_components/order-board'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS } from '@/lib/app-layout'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'

/** Tighter padding + fill height so column ScrollAreas work on tablet/desktop. */
const ORDER_BOARD_SECTION_CLASS =
  'flex min-h-0 flex-1 flex-col gap-3 bg-transparent p-3 lg:p-4' as const

type PageProps = {
  params: Promise<{ locationId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('services.digitalMenu.orders')
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

export default async function DigitalMenuOrdersPage({ params }: PageProps) {
  await connection()
  const { locationId: locationIdParam } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(locationIdParam)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, tServices, tDigital, tOrders] = await Promise.all([
    getCachedLocation(userId, locationIdParam),
    getTranslations('services'),
    getTranslations('services.digitalMenu'),
    getTranslations('services.digitalMenu.orders'),
  ])

  const location = locationData.location
  if (!location) notFound()

  return (
    <AnalyticsPageShell
      title={tOrders('heading')}
      chrome="compact"
      breadcrumbs={[
        { label: tServices('title'), href: routes.services },
        { label: tDigital('title'), href: routes.servicesDigitalMenu },
        { label: location.name, href: routes.servicesDigitalMenuLocation(locationId) },
        { label: tOrders('heading') },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={ORDER_BOARD_SECTION_CLASS}>
        <OrderBoard locationId={locationId} locationName={location.name} />
      </section>
    </AnalyticsPageShell>
  )
}
