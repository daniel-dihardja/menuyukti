import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { PostCreatorDynamic } from './post-creator-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('postCreator')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const tSidebar = await getTranslations('sidebar')
  const tPostCreator = await getTranslations('postCreator')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  return (
    <AnalyticsPageShell
      title={tPostCreator('title')}
      breadcrumbs={[
        { label: tSidebar('studio'), href: routes.canvas },
        { label: tPostCreator('title'), href: routes.canvasPostCreator },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <PostCreatorDynamic />
    </AnalyticsPageShell>
  )
}
