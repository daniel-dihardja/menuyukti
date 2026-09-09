import { BookOpen } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlaybookInstancesList } from '@/app/(protected)/playbooks/_components/playbook-instances-list'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { PLAYBOOKS_QUERY, type PlaybooksData } from '@/lib/graphql/queries/playbooks'
import { getPlaybookBySlug } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'

type PlaybookOverviewPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PlaybookOverviewPageProps): Promise<Metadata> {
  const { slug } = await params
  const playbook = getPlaybookBySlug(slug)
  if (!playbook) {
    return {}
  }

  const t = await getTranslations('playbooks')
  const title = t(`items.${playbook.id}.title`)
  const description = t(`items.${playbook.id}.description`)
  return { title, description, openGraph: { title, description } }
}

export default async function PlaybookOverviewPage({ params }: PlaybookOverviewPageProps) {
  const { slug } = await params
  const catalog = getPlaybookBySlug(slug)
  if (!catalog) {
    notFound()
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const t = await getTranslations('playbooks')
  const title = t(`items.${catalog.id}.title`)
  const description = t(`items.${catalog.id}.description`)

  const [locationsData, playbooksData] = await Promise.all([
    getCachedLocationsListData(userId),
    graphqlQuery<PlaybooksData>(PLAYBOOKS_QUERY, { playbookType: catalog.playbookType }, userId),
  ])

  const branches = locationsData.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }))
  const instances = playbooksData.playbooks
  const isEmpty = instances.length === 0

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: t('title'), href: routes.playbooks }, { label: title }]}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeading title={title} description={isEmpty ? undefined : description} />
          {!isEmpty ? (
            <Button asChild className="w-full shrink-0 sm:w-auto">
              <Link href={routes.playbookNew(catalog.slug)}>{t('createPlaybook')}</Link>
            </Button>
          ) : null}
        </div>
        {isEmpty ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t(`items.${catalog.id}.emptyTitle`)}</EmptyTitle>
              <EmptyDescription>{t(`items.${catalog.id}.emptyDescription`)}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={routes.playbookNew(catalog.slug)}>{t('createPlaybook')}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <PlaybookInstancesList slug={catalog.slug} instances={instances} branches={branches} />
        )}
      </div>
    </AnalyticsPageShell>
  )
}
