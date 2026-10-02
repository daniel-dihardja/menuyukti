'use client'

import { ChatPane } from '@/components/chat/chat-pane'

export function ChatSidePanel() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
      <ChatPane />
    </div>
  )
}
