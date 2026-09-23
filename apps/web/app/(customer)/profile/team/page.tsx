import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CustomerPageShell } from '@/components/customer/customer-page-shell'
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
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (customer) layout')
  }

  const initialData = await getWorkspaceTeamData(userId)
  if (!initialData) {
    notFound()
  }

  return (
    <CustomerPageShell maxWidth="lg">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <div className="pt-4">
          <WorkspaceTeamClient initialData={initialData} />
        </div>
      </div>
    </CustomerPageShell>
  )
}
