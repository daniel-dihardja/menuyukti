import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'

import { AgentChatDynamic } from './_components/agent-chat-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agentChat')
  const title = t('metaTitle')
  const description = t('metaDescription')
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export default async function AgentPage() {
  const t = await getTranslations('agentChat')
  const tDash = await getTranslations('platform.dashboard')

  return (
    <AnalyticsPageShell
      breadcrumbs={[{ label: tDash('title'), href: routes.dashboard }, { label: t('metaTitle') }]}
      title={t('metaTitle')}
    >
      <AgentChatDynamic />
    </AnalyticsPageShell>
  )
}
