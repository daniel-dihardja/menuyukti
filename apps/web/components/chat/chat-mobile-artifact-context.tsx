'use client'

import { createContext, use, type ReactNode } from 'react'

export type ChatMobileArtifactContextValue = {
  openArtifact: () => void
  hint: string | null
}

const ChatMobileArtifactContext = createContext<ChatMobileArtifactContextValue | null>(null)

export function ChatMobileArtifactProvider({
  children,
  openArtifact,
  hint,
}: {
  children: ReactNode
  openArtifact: () => void
  hint?: string | null
}) {
  return (
    <ChatMobileArtifactContext value={{ openArtifact, hint: hint ?? null }}>
      {children}
    </ChatMobileArtifactContext>
  )
}

/** Present only on mobile when the artifact sheet is available. */
export function useChatMobileArtifact(): ChatMobileArtifactContextValue | null {
  return use(ChatMobileArtifactContext)
}
