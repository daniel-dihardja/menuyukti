import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { notFound, redirect } from 'next/navigation'

import { VotingConsole } from '@/app/(protected)/services/voting/_components/voting-console'
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
import { VOTINGS_QUERY, type VotingsData } from '@/lib/graphql/queries/votings'
import {
  MY_SERVICE_SUBSCRIPTIONS_QUERY,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_KEY_VOTING,
  SERVICE_STATUS_ACTIVE,
  type MyServiceSubscriptionsData,
} from '@/lib/graphql/queries/service-subscriptions'
import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ locationId: string }>
}

function VotingLocationSkeleton() {
  return (
    <section className={`${LOCATION_DETAIL_SECTION_CLASS} flex flex-col gap-6`}>
      <Skeleton className="h-28 w-full max-w-xl rounded-lg" />
      <Skeleton className="h-64 w-full max-w-xl rounded-lg" />
    </section>
  )
}

async function VotingLocationContent({ params }: { params: Promise<{ locationId: string }> }) {
  await connection()
  const { locationId: locationIdParam } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(locationIdParam)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, subscriptionsData, votingsData, tConsole] = await Promise.all([
    graphqlQuery<LocationData>(LOCATION_QUERY, { id: locationIdParam }, userId, 'Location'),
    graphqlQuery<MyServiceSubscriptionsData>(
      MY_SERVICE_SUBSCRIPTIONS_QUERY,
      { includeCanceled: false },
      userId,
      'MyServiceSubscriptions',
    ),
    graphqlQuery<VotingsData>(VOTINGS_QUERY, { locationId }, userId, 'Votings'),
    getTranslations('services.voting.console'),
  ])

  const location = locationData.location
  if (!location) notFound()

  const isActive = subscriptionsData.myServiceSubscriptions.some(
    (row) =>
      row.serviceKey === SERVICE_KEY_VOTING &&
      row.status === SERVICE_STATUS_ACTIVE &&
      Number(row.locationId) === locationId,
  )
  if (!isActive) {
    redirect(routes.servicesVoting)
  }

  const pointSystemActive = subscriptionsData.myServiceSubscriptions.some(
    (row) =>
      row.serviceKey === SERVICE_KEY_POINT_SYSTEM &&
      row.status === SERVICE_STATUS_ACTIVE &&
      Number(row.locationId) === locationId,
  )

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
            <Link href={routes.servicesVoting}>{tConsole('backCta')}</Link>
          </Button>
        </CardContent>
      </Card>

      <VotingConsole
        locationId={locationId}
        initialPublicSlug={location.publicSlug ?? null}
        initialVotings={votingsData.votings}
        pointSystemActive={pointSystemActive}
      />
    </section>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('services.voting.console')
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

export default async function VotingLocationPage({ params }: PageProps) {
  const [tServices, tVoting, tConsole] = await Promise.all([
    getTranslations('services'),
    getTranslations('services.voting'),
    getTranslations('services.voting.console'),
  ])

  return (
    <AnalyticsPageShell
      title={tConsole('heading')}
      breadcrumbs={[
        { label: tServices('title'), href: routes.services },
        { label: tVoting('title'), href: routes.servicesVoting },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <Suspense fallback={<VotingLocationSkeleton />}>
        <VotingLocationContent params={params} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
