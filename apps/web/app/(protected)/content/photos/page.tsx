import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { PhotosDynamic } from './photos-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('photos')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

export default async function Page() {
  const tSidebar = await getTranslations('sidebar')
  const tPhotos = await getTranslations('photos')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  return (
    <AnalyticsPageShell
      title={tPhotos('title')}
      breadcrumbs={[
        { label: tSidebar('content'), href: routes.content.photos },
        { label: tSidebar('photos'), href: routes.content.photos },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <PhotosDynamic />
    </AnalyticsPageShell>
  )
}
