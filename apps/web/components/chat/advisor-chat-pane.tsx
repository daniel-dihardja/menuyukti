'use client'

import dynamic from 'next/dynamic'

import { ChatPreviewPanelSkeleton } from '@/components/chat/chat-workspace-skeleton'

const AdvisorCopilotChatLazy = dynamic(
  () =>
    import('@/components/chat/copilotkit/advisor-copilot-chat').then((m) => m.AdvisorCopilotChat),
  {
    ssr: false,
    loading: () => <ChatPreviewPanelSkeleton className="h-full w-full" />,
  },
)

/** Conversation column — CopilotKit / AG-UI (ChatKit removed in TASK-14.9). */
export function AdvisorChatPane() {
  return <AdvisorCopilotChatLazy />
}
