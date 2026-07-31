import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { LocationForm, type Weekday } from '../location-form'

type PageProps = {
  params: Promise<{ id: string }>
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
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={LOCATION_DETAIL_SECTION_CLASS}>
        <PageHeading title={location.name} />
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
      </section>
    </AnalyticsPageShell>
  )
}
