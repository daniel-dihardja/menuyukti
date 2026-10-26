import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_QUERY, type LocationData } from '@/lib/graphql/queries/locations'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { LocationDetailActions } from '../location-detail-actions'
import { LocationForm, type Weekday } from '../location-form'

type PageProps = {
  params: Promise<{ id: string }>
}

function LocationDetailSkeleton() {
  return (
    <section className={LOCATION_DETAIL_SECTION_CLASS}>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-80 w-full rounded-lg" />
    </section>
  )
}

async function LocationDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await graphqlQuery<LocationData>(LOCATION_QUERY, { id }, userId, 'Location')
  const location = data.location
  if (!location) {
    notFound()
  }

  const openingHoursByDay = new Map(
    location.openingHours.map((entry) => [
      entry.dayOfWeek,
      { open: entry.openTime, close: entry.closeTime },
    ]),
  )
  const weekdays: Weekday[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]

  return (
    <section className={LOCATION_DETAIL_SECTION_CLASS}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading title={location.name} />
        <LocationDetailActions locationId={location.id} />
      </div>
      <LocationForm
        key={`${location.id}-${JSON.stringify(location.manualBriefInput?.quickProfile ?? {})}`}
        mode="edit"
        locationId={location.id}
        initialManualQuickProfile={location.manualBriefInput?.quickProfile ?? null}
        initialValues={{
          name: location.name,
          street: location.street ?? '',
          city: location.city ?? '',
          country: location.country ?? '',
          currency: location.currency ?? '',
          publicSlug: location.publicSlug ?? '',
          openingHours: weekdays.map((day) => {
            const slot = openingHoursByDay.get(day)
            const hasSlot = Boolean(slot?.open && slot?.close)
            return {
              dayOfWeek: day,
              closed: !hasSlot,
              openTime: hasSlot ? (slot?.open ?? '') : '',
              closeTime: hasSlot ? (slot?.close ?? '') : '',
            }
          }),
        }}
      />
    </section>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('analytics.branches')
  const description = t('description')
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('title'), description, openGraph: { title: t('title'), description } }
  }
  const data = await getCachedLocation(userId, id)
  const title = data.location?.name ?? t('title')
  return { title, description, openGraph: { title, description } }
}

export default async function Page({ params }: PageProps) {
  // Bind this route to the request before auth. Clerk session checks can read
  // the current time; without this, Cache Components treats Date.now() as a
  // blocking prerender value on the page segment (layout connection() is not enough).
  await connection()
  const t = await getTranslations('analytics.branches')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title'), href: routes.analytics.branches }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <Suspense fallback={<LocationDetailSkeleton />}>
        <LocationDetailContent params={params} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
