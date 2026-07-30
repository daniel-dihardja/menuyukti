'use client'

import { ChatComposer } from '@/components/chat/chat-composer'
import { ChatMessageList } from '@/components/chat/chat-message-list'

export function ChatPane() {
  return (
    <>
      <ChatMessageList />
      <ChatComposer />
    </>
  )
}
