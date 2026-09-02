'use client'

import { createContext, use, useMemo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { useChatMeta } from '@/components/chat/chat-context'
import { useChatVisualizationsState } from '@/components/chat/visualizations/chat-visualizations-context'

const ChatMentionContext = createContext<string[] | null>(null)

export function ChatMentionProvider({ children }: { children: ReactNode }) {
  const { addedIds, analyticsRunId } = useChatVisualizationsState()
  const { isChatBusy } = useChatMeta()
  const tViz = useTranslations('chat.visualizations.catalog')

  const mentionTitles = useMemo(() => {
    if (analyticsRunId === null) return []
    return addedIds.map((id) => tViz(`${id}.title`))
  }, [addedIds, analyticsRunId, tViz])

  return (
    <ChatMentionBusyContext value={isChatBusy || analyticsRunId === null}>
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
  const { addedIds, analyticsRunId } = useChatVisualizationsState()
  const tViz = useTranslations('chat.visualizations.catalog')

  const visualizations = useMemo((): VisualizationMentionItem[] => {
    if (analyticsRunId === null) return []
    return addedIds.map((id) => ({
      id,
      title: tViz(`${id}.title`),
    }))
  }, [addedIds, analyticsRunId, tViz])

  return {
    visualizations,
    mentionMenusDisabled: mentionMenusDisabled || analyticsRunId === null,
  }
}
