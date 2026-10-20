import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { PickupOfferPdpClient } from '@/app/(protected)/services/pickup-offer/_components/pickup-offer-pdp-client'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_SERVICE_SUBSCRIPTIONS_QUERY,
  SERVICE_KEY_PICKUP_OFFER,
  SERVICE_STATUS_ACTIVE,
  type MyServiceSubscriptionsData,
} from '@/lib/graphql/queries/service-subscriptions'
import { routes } from '@/lib/routes'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('services.pickupOffer')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

function PickupOfferPdpSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <Skeleton className="aspect-[4/3] w-full max-w-md rounded-lg" />
      <Skeleton className="h-40 w-full max-w-xl rounded-lg" />
    </div>
  )
}

async function PickupOfferPdpData() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const [locationsData, subscriptionsData] = await Promise.all([
    getCachedLocationsListData(userId),
    graphqlQuery<MyServiceSubscriptionsData>(
      MY_SERVICE_SUBSCRIPTIONS_QUERY,
      { includeCanceled: false },
      userId,
      'MyServiceSubscriptions',
    ),
  ])

  const locations = locationsData.locations
    .map((location) => {
      const id = Number(location.id)
      if (!Number.isInteger(id) || id < 1) return null
      return { id, name: location.name }
    })
    .filter((row): row is { id: number; name: string } => row != null)

  const locationNameById = new Map(locations.map((location) => [location.id, location.name]))

  const connectedLocations = subscriptionsData.myServiceSubscriptions
    .filter(
      (row) => row.serviceKey === SERVICE_KEY_PICKUP_OFFER && row.status === SERVICE_STATUS_ACTIVE,
    )
    .flatMap((row) => {
      const id = Number(row.locationId)
      if (!Number.isInteger(id) || id < 1) return []
      const name = locationNameById.get(id)
      if (!name) return []
      return [{ id, name }]
    })

  return <PickupOfferPdpClient locations={locations} connectedLocations={connectedLocations} />
}

export default async function PickupOfferServicePage() {
  const tServices = await getTranslations('services')
  const t = await getTranslations('services.pickupOffer')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: tServices('title'), href: routes.services }, { label: t('title') }]}
    >
      <Suspense fallback={<PickupOfferPdpSkeleton />}>
        <PickupOfferPdpData />
      </Suspense>
    </AnalyticsPageShell>
  )
}
