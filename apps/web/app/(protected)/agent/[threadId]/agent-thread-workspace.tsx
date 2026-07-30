'use client'

import dynamic from 'next/dynamic'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  getAgentThread,
  isAgentThreadId,
  type AgentThreadRecord,
} from '@/lib/chat/agent-thread-registry'
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

export function AgentThreadWorkspace({ threadId }: { threadId: string }) {
  const t = useTranslations('agentChat')
  const router = useRouter()
  const [record, setRecord] = useState<AgentThreadRecord | null | undefined>(undefined)

  useEffect(() => {
    if (!isAgentThreadId(threadId)) {
      setRecord(null)
      return
    }
    const found = getAgentThread(threadId)
    setRecord(found)
  }, [threadId])

  if (!isAgentThreadId(threadId)) {
    notFound()
  }

  if (record === undefined) {
    return <Skeleton className="min-h-[20rem] w-full flex-1 rounded-lg" />
  }

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AgentChatPanel
        agentThreadId={record.id}
        analyticsRunId={record.analyticsRunId}
        locationId={record.locationId}
      />
    </div>
  )
}
