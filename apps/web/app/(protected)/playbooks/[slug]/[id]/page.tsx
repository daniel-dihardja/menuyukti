import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PlaybookForm } from '@/app/(protected)/playbooks/_components/playbook-form'
import { PublicHolidaysInstanceClient } from '@/app/(protected)/playbooks/_components/public-holidays-instance-client'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { PLAYBOOK_QUERY, type PlaybookData } from '@/lib/graphql/queries/playbooks'
import { getPlaybookBySlug, slugFromPlaybookType } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'

type PlaybookInstancePageProps = {
  params: Promise<{ slug: string; id: string }>
}

export async function generateMetadata({ params }: PlaybookInstancePageProps): Promise<Metadata> {
  const { slug, id: idParam } = await params
  const catalog = getPlaybookBySlug(slug)
  const id = Number(idParam)
  if (!catalog || !Number.isInteger(id) || id < 1) {
    return {}
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return {}
  }

  const data = await graphqlQuery<PlaybookData>(PLAYBOOK_QUERY, { id }, userId)
  if (!data.playbook) {
    return {}
  }

  const t = await getTranslations('playbooks')
  const title = data.playbook.name
  const description = t(`items.${catalog.id}.description`)
  return { title, description, openGraph: { title, description } }
}

export default async function PlaybookInstancePage({ params }: PlaybookInstancePageProps) {
  const { slug, id: idParam } = await params
  const catalog = getPlaybookBySlug(slug)
  const id = Number(idParam)
  if (!catalog || !Number.isInteger(id) || id < 1) {
    notFound()
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const [playbookData, locationsData] = await Promise.all([
    graphqlQuery<PlaybookData>(PLAYBOOK_QUERY, { id }, userId),
    getCachedLocationsListData(userId),
  ])

  const playbook = playbookData.playbook
  if (!playbook) {
    notFound()
  }

  const typeSlug = slugFromPlaybookType(playbook.playbookType)
  if (typeSlug !== catalog.slug) {
    notFound()
  }

  const t = await getTranslations('playbooks')
  const overviewTitle = t(`items.${catalog.id}.title`)
  const branches = locationsData.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))

  return (
    <AnalyticsPageShell
      title={playbook.name}
      breadcrumbs={[
        { label: t('title'), href: routes.playbooks },
        { label: overviewTitle, href: routes.playbookDetail(catalog.slug) },
        { label: playbook.name },
      ]}
    >
      <div className="flex flex-col gap-6">
        <PageHeading title={playbook.name} description={t(`items.${catalog.id}.description`)} />
        {catalog.id === 'publicHolidays' ? (
          <PublicHolidaysInstanceClient
            playbookId={playbook.id}
            catalog={catalog}
            branches={branches}
            initialValues={{
              name: playbook.name,
              locationId: playbook.locationId,
              startDate: playbook.startDate,
              endDate: playbook.endDate,
            }}
          />
        ) : (
          <PlaybookForm
            mode="edit"
            playbookId={playbook.id}
            catalog={catalog}
            branches={branches}
            initialValues={{
              name: playbook.name,
              locationId: playbook.locationId,
              startDate: playbook.startDate,
              endDate: playbook.endDate,
            }}
          />
        )}
      </div>
    </AnalyticsPageShell>
  )
}
