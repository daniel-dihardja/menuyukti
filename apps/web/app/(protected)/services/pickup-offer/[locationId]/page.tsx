import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PickupOfferConsole } from '@/app/(protected)/services/pickup-offer/_components/pickup-offer-console'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_QUERY, type LocationData } from '@/lib/graphql/queries/locations'
import { PICKUP_OFFERS_QUERY, type PickupOffersData } from '@/lib/graphql/queries/pickup-offers'
import {
  MY_SERVICE_SUBSCRIPTIONS_QUERY,
  SERVICE_KEY_PICKUP_OFFER,
  SERVICE_STATUS_ACTIVE,
  type MyServiceSubscriptionsData,
} from '@/lib/graphql/queries/service-subscriptions'
import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ locationId: string }>
}

function PickupOfferLocationSkeleton() {
  return (
    <section className={`${LOCATION_DETAIL_SECTION_CLASS} flex flex-col gap-6`}>
      <Skeleton className="h-28 w-full max-w-xl rounded-lg" />
      <Skeleton className="h-64 w-full max-w-xl rounded-lg" />
    </section>
  )
}

async function PickupOfferLocationContent({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId: locationIdParam } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(locationIdParam)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, subscriptionsData, offersData, tConsole] = await Promise.all([
    graphqlQuery<LocationData>(LOCATION_QUERY, { id: locationIdParam }, userId, 'Location'),
    graphqlQuery<MyServiceSubscriptionsData>(
      MY_SERVICE_SUBSCRIPTIONS_QUERY,
      { includeCanceled: false },
      userId,
      'MyServiceSubscriptions',
    ),
    graphqlQuery<PickupOffersData>(PICKUP_OFFERS_QUERY, { locationId }, userId, 'PickupOffers'),
    getTranslations('services.pickupOffer.console'),
  ])

  const location = locationData.location
  if (!location) notFound()

  const isActive = subscriptionsData.myServiceSubscriptions.some(
    (row) =>
      row.serviceKey === SERVICE_KEY_PICKUP_OFFER &&
      row.status === SERVICE_STATUS_ACTIVE &&
      Number(row.locationId) === locationId,
  )
  if (!isActive) {
    redirect(routes.servicesPickupOffer)
  }

  return (
    <section className={`${LOCATION_DETAIL_SECTION_CLASS} flex flex-col gap-6`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tConsole('enabled')}</CardTitle>
          <CardDescription>
            {location.name} · {tConsole('enabledHint')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary" className="w-fit">
            <Link href={routes.servicesPickupOffer}>{tConsole('backCta')}</Link>
          </Button>
        </CardContent>
      </Card>

      <PickupOfferConsole
        key={
          offersData.pickupOffers.map((o) => `${o.id}:${o.status}:${o.isLive}`).join('|') || 'empty'
        }
        locationId={locationId}
        locationCurrency={location.currency ?? null}
        initialPublicSlug={location.publicSlug ?? null}
        initialOffers={offersData.pickupOffers}
      />
    </section>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('services.pickupOffer.console')
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

export default async function PickupOfferLocationPage({ params }: PageProps) {
  const [tServices, tOffer, tConsole] = await Promise.all([
    getTranslations('services'),
    getTranslations('services.pickupOffer'),
    getTranslations('services.pickupOffer.console'),
  ])

  return (
    <AnalyticsPageShell
      title={tConsole('heading')}
      breadcrumbs={[
        { label: tServices('title'), href: routes.services },
        { label: tOffer('title'), href: routes.servicesPickupOffer },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <Suspense fallback={<PickupOfferLocationSkeleton />}>
        <PickupOfferLocationContent params={params} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
