'use client'

import dynamic from 'next/dynamic'
import { notFound, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  getAgentThread,
  isAgentThreadId,
  touchAgentThread,
  type AgentThreadRecord,
} from '@/lib/chat/agent-thread-registry'
import { routes } from '@/lib/routes'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import { useSalesReportLabel } from '@/hooks/use-sales-report-label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import { ChatWorkspaceSkeleton } from '@/components/chat/chat-workspace-skeleton'

const AgentChatPanel = dynamic(
  () => import('../_components/agent-chat-panel').then((m) => m.AgentChatPanel),
  {
    ssr: false,
    loading: () => <ChatWorkspaceSkeleton className="min-h-[min(420px,50vh)] flex-1" />,
  },
)

function AgentThreadSalesReportStrip({
  locationId,
  analyticsRunId,
  className,
}: {
  locationId: number
  analyticsRunId: number | null
  className?: string
}) {
  const t = useTranslations('agentChat')
  const salesReportLabel = useSalesReportLabel(locationId, analyticsRunId)

  return (
    <p className={cn('shrink-0 truncate text-muted-foreground text-sm', className)}>
      <span className="font-medium text-foreground">{t('salesReportDetailLabel')}:</span>{' '}
      <span title={salesReportLabel}>{salesReportLabel}</span>
    </p>
  )
}

function AgentThreadWorkspaceInner({ threadId }: { threadId: string }) {
  const t = useTranslations('agentChat')
  const router = useRouter()
  const compact = useCompactLayout()
  // Client-only gate: getAgentThread reads localStorage (unavailable during SSR).
  const [hydrated, setHydrated] = useState(false)
  const [analyticsRunId, setAnalyticsRunIdState] = useState<number | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !isAgentThreadId(threadId)) return
    const next = getAgentThread(threadId)
    setAnalyticsRunIdState(next?.analyticsRunId ?? null)
  }, [hydrated, threadId])

  const handleAnalyticsRunIdChange = useCallback(
    (next: number | null) => {
      setAnalyticsRunIdState(next)
      touchAgentThread(threadId, { analyticsRunId: next })
    },
    [threadId],
  )

  if (!isAgentThreadId(threadId)) {
    notFound()
  }

  if (!hydrated) {
    return <Skeleton className="min-h-[20rem] w-full flex-1 rounded-lg" />
  }

  const record: AgentThreadRecord | null = getAgentThread(threadId)

  if (record === null) {
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {!compact ? (
        <AgentThreadSalesReportStrip
          analyticsRunId={analyticsRunId}
          locationId={record.locationId}
        />
      ) : null}
      <AgentChatPanel
        agentThreadId={record.id}
        analyticsRunId={analyticsRunId}
        locationId={record.locationId}
        onAnalyticsRunIdChange={handleAnalyticsRunIdChange}
      />
    </div>
  )
}

/** Remount on threadId so hydration + localStorage read re-run cleanly. */
export function AgentThreadWorkspace({ threadId }: { threadId: string }) {
  return <AgentThreadWorkspaceInner key={threadId} threadId={threadId} />
}
