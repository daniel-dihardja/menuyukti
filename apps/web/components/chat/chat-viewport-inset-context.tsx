'use client'

import { createContext, use, type ReactNode } from 'react'

import { useVisualViewportInset } from '@/hooks/use-visual-viewport-inset'

type ChatViewportInsetContextValue = {
  bottomInset: number
}

const ChatViewportInsetContext = createContext<ChatViewportInsetContextValue>({
  bottomInset: 0,
})

export function ChatViewportInsetProvider({ children }: { children: ReactNode }) {
  const { bottomInset } = useVisualViewportInset(true)
  return <ChatViewportInsetContext value={{ bottomInset }}>{children}</ChatViewportInsetContext>
}

export function useChatViewportInset(): ChatViewportInsetContextValue {
  return use(ChatViewportInsetContext)
}
