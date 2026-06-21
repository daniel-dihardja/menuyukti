import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { getWorkspaceTeamData } from '@/lib/workspace/members'

import { WorkspaceTeamClient } from './_components/workspace-team-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workspaceTeam')
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function WorkspaceTeamPage() {
  const t = await getTranslations('workspaceTeam')
  const profileT = await getTranslations('profile')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const initialData = await getWorkspaceTeamData(userId)
  if (!initialData) {
    notFound()
  }

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[
        { label: profileT('breadcrumb'), href: routes.profile },
        { label: t('breadcrumb') },
      ]}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <div className="pt-4">
          <WorkspaceTeamClient initialData={initialData} />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
