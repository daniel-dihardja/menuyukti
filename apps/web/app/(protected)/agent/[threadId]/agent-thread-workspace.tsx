'use client'

import dynamic from 'next/dynamic'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { fetchAnalyticsList, type AnalyticsRunListItem } from '@/lib/api/client-fetch'
import {
  getAgentThread,
  isAgentThreadId,
  type AgentThreadRecord,
} from '@/lib/chat/agent-thread-registry'
import { resolveAnalyticsRunName } from '@/lib/chat/resolve-analytics-run-name'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

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
}: {
  locationId: number
  analyticsRunId: number | null
}) {
  const t = useTranslations('agentChat')
  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRunListItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setAnalyticsRuns(null)
    void fetchAnalyticsList(locationId)
      .then((runs) => {
        if (cancelled) return
        setAnalyticsRuns(runs)
      })
      .catch(() => {
        if (cancelled) return
        setAnalyticsRuns([])
      })
    return () => {
      cancelled = true
    }
  }, [locationId])

  const salesReportFallbacks = useMemo(
    () => ({
      none: t('noSalesReport'),
      unavailable: t('salesReportUnavailable'),
    }),
    [t],
  )

  const salesReportLabel =
    analyticsRuns === null
      ? t('salesReportLoading')
      : resolveAnalyticsRunName(analyticsRuns, analyticsRunId, salesReportFallbacks)

  return (
    <p className="shrink-0 truncate text-muted-foreground text-sm">
      <span className="font-medium text-foreground">{t('salesReportDetailLabel')}:</span>{' '}
      <span title={salesReportLabel}>{salesReportLabel}</span>
    </p>
  )
}

function AgentThreadWorkspaceInner({ threadId }: { threadId: string }) {
  const t = useTranslations('agentChat')
  const router = useRouter()
  // Client-only gate: getAgentThread reads localStorage (unavailable during SSR).
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!isAgentThreadId(threadId)) {
    notFound()
  }

  if (!hydrated) {
    return <Skeleton className="min-h-[20rem] w-full flex-1 rounded-lg" />
  }

  // Derive during render after hydration (no effect→setState sync for threadId).
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
      <AgentThreadSalesReportStrip
        analyticsRunId={record.analyticsRunId}
        locationId={record.locationId}
      />
      <AgentChatPanel
        agentThreadId={record.id}
        analyticsRunId={record.analyticsRunId}
        locationId={record.locationId}
      />
    </div>
  )
}

/** Remount on threadId so hydration + localStorage read re-run cleanly. */
export function AgentThreadWorkspace({ threadId }: { threadId: string }) {
  return <AgentThreadWorkspaceInner key={threadId} threadId={threadId} />
}
