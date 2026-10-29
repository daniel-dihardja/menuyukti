'use client'

import dynamic from 'next/dynamic'
import { notFound, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'

import {
  getAgentThread,
  isAgentThreadId,
  touchAgentThread,
  type AgentThreadRecord,
} from '@/lib/chat/agent-thread-registry'
import { rebindAgentThreadLocation } from '@/lib/chat/resolve-agent-thread-for-location'
import { routes } from '@/lib/routes'
import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'

import { ChatWorkspaceSkeleton } from '@/components/chat/chat-workspace-skeleton'
import type { AdvisorBranchOption } from '@/components/chat/chatkit/advisor-chatkit-shell-context'

const AgentChatPanel = dynamic(
  () => import('../_components/agent-chat-panel').then((m) => m.AgentChatPanel),
  {
    ssr: false,
    loading: () => <ChatWorkspaceSkeleton className="min-h-[min(420px,50vh)] flex-1" />,
  },
)

const emptySubscribe = () => () => {}

/** True after client hydration; false on server / during hydrate (uses getServerSnapshot). */
function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

function AgentThreadWorkspaceInner({
  threadId,
  branches,
}: {
  threadId: string
  branches: AdvisorBranchOption[]
}) {
  const t = useTranslations('agentChat')
  const router = useRouter()
  const { setLocationId: setAnalyticsLocationId } = useAnalytics()
  const isClient = useIsClient()
  const [locationId, setLocationIdState] = useState<number | null>(null)
  const [analyticsRunId, setAnalyticsRunIdState] = useState<number | null>(null)

  useEffect(() => {
    if (!isClient || !isAgentThreadId(threadId)) return
    const record = getAgentThread(threadId)
    setLocationIdState(record?.locationId ?? null)
    setAnalyticsRunIdState(record?.analyticsRunId ?? null)
  }, [isClient, threadId])

  const handleAnalyticsRunIdChange = useCallback(
    (next: number | null) => {
      setAnalyticsRunIdState(next)
      touchAgentThread(threadId, { analyticsRunId: next })
    },
    [threadId],
  )

  const handleLocationIdChange = useCallback(
    (next: number) => {
      const updated = rebindAgentThreadLocation(threadId, next)
      if (!updated) return
      setLocationIdState(updated.locationId)
      setAnalyticsRunIdState(updated.analyticsRunId)
      setAnalyticsLocationId(updated.locationId)
    },
    [setAnalyticsLocationId, threadId],
  )

  if (!isAgentThreadId(threadId)) {
    notFound()
  }

  // Avoid localStorage during SSR/hydrate; start dynamic panel on first client paint.
  if (!isClient) {
    return <ChatWorkspaceSkeleton className="min-h-[min(420px,50vh)] flex-1" />
  }

  const record: AgentThreadRecord | null = getAgentThread(threadId)

  if (record === null || locationId === null) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">{t('threadNotFound')}</p>
        <button
          className="text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => router.replace(routes.agent)}
          type="button"
        >
          {t('backToList')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AgentChatPanel
        agentThreadId={record.id}
        analyticsRunId={analyticsRunId}
        branches={branches}
        locationId={locationId}
        onAnalyticsRunIdChange={handleAnalyticsRunIdChange}
        onLocationIdChange={handleLocationIdChange}
      />
    </div>
  )
}

/** Remount on threadId so localStorage read re-runs cleanly. */
export function AgentThreadWorkspace({
  threadId,
  branches,
}: {
  threadId: string
  branches: AdvisorBranchOption[]
}) {
  return <AgentThreadWorkspaceInner key={threadId} threadId={threadId} branches={branches} />
}
