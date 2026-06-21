'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

const AgentChat = dynamic(() => import('./agent-chat').then((m) => m.AgentChat), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[400px] flex-col gap-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="min-h-[280px] flex-1 rounded-lg" />
      <Skeleton className="h-12 w-full" />
    </div>
  ),
})

export function AgentChatDynamic() {
  return <AgentChat />
}
