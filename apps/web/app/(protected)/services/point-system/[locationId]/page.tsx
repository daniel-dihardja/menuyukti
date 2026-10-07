import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PointSystemRulesForm } from '@/components/point-system-rules-form'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import { getCachedLocation } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  POINT_EARN_RULES_QUERY,
  type PointEarnRulesData,
} from '@/lib/graphql/queries/point-earn-rules'
import {
  MY_SERVICE_SUBSCRIPTIONS_QUERY,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_STATUS_ACTIVE,
  type MyServiceSubscriptionsData,
} from '@/lib/graphql/queries/service-subscriptions'
import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ locationId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('services.pointSystem.console')
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

export default async function PointSystemLocationPage({ params }: PageProps) {
  const { locationId: locationIdParam } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(locationIdParam)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, subscriptionsData, rulesData, tServices, tPoint, tConsole] =
    await Promise.all([
      getCachedLocation(userId, locationIdParam),
      graphqlQuery<MyServiceSubscriptionsData>(
        MY_SERVICE_SUBSCRIPTIONS_QUERY,
        { includeCanceled: false },
        userId,
        'MyServiceSubscriptions',
      ),
      graphqlQuery<PointEarnRulesData>(
        POINT_EARN_RULES_QUERY,
        { locationId },
        userId,
        'PointEarnRules',
      ),
      getTranslations('services'),
      getTranslations('services.pointSystem'),
      getTranslations('services.pointSystem.console'),
    ])

  const location = locationData.location
  if (!location) notFound()

  const isActive = subscriptionsData.myServiceSubscriptions.some(
    (row) =>
      row.serviceKey === SERVICE_KEY_POINT_SYSTEM &&
      row.status === SERVICE_STATUS_ACTIVE &&
      Number(row.locationId) === locationId,
  )
  if (!isActive) notFound()

  return (
    <AnalyticsPageShell
      title={tConsole('heading')}
      breadcrumbs={[
        { label: tServices('title'), href: routes.services },
        { label: tPoint('title'), href: routes.servicesPointSystem },
        { label: location.name },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={`${LOCATION_DETAIL_SECTION_CLASS} flex flex-col gap-6`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tConsole('enabled')}</CardTitle>
            <CardDescription>{tConsole('enabledHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-fit">
              <Link href={routes.servicesPointSystem}>{tConsole('backCta')}</Link>
            </Button>
          </CardContent>
        </Card>

        <PointSystemRulesForm locationId={locationId} initialRules={rulesData.pointEarnRules} />
      </section>
    </AnalyticsPageShell>
  )
}
