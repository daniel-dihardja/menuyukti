import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

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
          <WorkspaceTeamClient />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
