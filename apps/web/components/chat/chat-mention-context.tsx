'use client'

import { createContext, use, useMemo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { useChatMessages } from '@/components/chat/chat-context'
import { useChatVisualizationsState } from '@/components/chat/visualizations/chat-visualizations-context'

const ChatMentionContext = createContext<string[] | null>(null)

export function ChatMentionProvider({ children }: { children: ReactNode }) {
  const { addedIds } = useChatVisualizationsState()
  const { isChatBusy } = useChatMessages()
  const tViz = useTranslations('chat.visualizations.catalog')

  const mentionTitles = useMemo(() => {
    return addedIds.map((id) => tViz(`${id}.title`))
  }, [addedIds, tViz])

  return (
    <ChatMentionBusyContext value={isChatBusy}>
      <ChatMentionContext value={mentionTitles}>{children}</ChatMentionContext>
    </ChatMentionBusyContext>
  )
}

const ChatMentionBusyContext = createContext(false)

export function useChatMentionTitles(): string[] | undefined {
  return use(ChatMentionContext) ?? undefined
}

export type VisualizationMentionItem = {
  id: string
  title: string
}

export function useChatMentionItems() {
  const mentionMenusDisabled = use(ChatMentionBusyContext)
  const { addedIds } = useChatVisualizationsState()
  const tViz = useTranslations('chat.visualizations.catalog')

  const visualizations = useMemo(
    (): VisualizationMentionItem[] =>
      addedIds.map((id) => ({
        id,
        title: tViz(`${id}.title`),
      })),
    [addedIds, tViz],
  )

  return {
    visualizations,
    mentionMenusDisabled,
  }
}
