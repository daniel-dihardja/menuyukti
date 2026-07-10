import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { MediaDynamic } from './media-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('media')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const tMedia = await getTranslations('media')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  return (
    <AnalyticsPageShell
      title={tMedia('title')}
      breadcrumbs={[{ label: tMedia('title'), href: routes.media }]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <MediaDynamic />
    </AnalyticsPageShell>
  )
}
