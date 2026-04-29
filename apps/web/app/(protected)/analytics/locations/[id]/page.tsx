import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'
import { LocationForm, type Weekday } from '../location-form'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocation(userId, id)
  const location = data.location
  if (!location) {
    notFound()
  }

  const t = await getTranslations('analytics.branches')
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
    <AnalyticsPageShell
      title={location.name}
      breadcrumbs={[
        { label: t('title'), href: routes.analytics.branches },
        { label: location.name },
      ]}
    >
      <PageHeading title={location.name} description={t('detailDescription')} />
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
    </AnalyticsPageShell>
  )
}
