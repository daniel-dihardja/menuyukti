import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

import { AgentThreadWorkspace } from './agent-thread-workspace'

const threadIdParamSchema = z.string().uuid()

type PageProps = {
  params: Promise<{ threadId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { threadId } = await params
  const t = await getTranslations('agentChat')
  const parsed = threadIdParamSchema.safeParse(threadId)
  if (!parsed.success) {
    return { title: t('metaTitle') }
  }
  return {
    title: t('threadPageTitle', { id: parsed.data.slice(0, 8) }),
  }
}

export default async function AgentThreadPage({ params }: PageProps) {
  const { threadId: rawId } = await params
  const parsed = threadIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    notFound()
  }
  const threadId = parsed.data

  const t = await getTranslations('agentChat')
  const title = t('threadPageTitle', { id: threadId.slice(0, 8) })

  return (
    <AnalyticsPageShell
      breadcrumbs={[{ label: t('metaTitle'), href: routes.agent }, { label: title }]}
      contentWidth="full"
      mainClassName={cn(
        ANALYTICS_REPORT_SHELL_MAIN_CLASS,
        'flex min-h-0 w-full flex-1 flex-col overflow-hidden',
      )}
      title={title}
    >
      <AgentThreadWorkspace threadId={threadId} />
    </AnalyticsPageShell>
  )
}
