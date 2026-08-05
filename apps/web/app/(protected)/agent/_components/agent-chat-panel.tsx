'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useChatPreviewVisibility } from '@/components/chat/use-chat-preview-visibility'
import { useChatComposerState } from '@/components/chat/chat-context'
import {
  ChatOnlyLayout,
  ChatWithMobileArtifactLayout,
  ChatWithPreviewLayout,
} from '@/components/chat/chat-layout'
import { ChatMentionProvider } from '@/components/chat/chat-mention-context'
import { ChatSidePanel } from '@/components/chat/chat-side-panel'
import { ChatVisualizationsProvider } from '@/components/chat/visualizations/chat-visualizations-context'
import { ChatPreviewPanelSkeleton } from '@/components/chat/chat-workspace-skeleton'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { routes } from '@/lib/routes'

import { AgentChatHost } from './agent-chat-host'

const ChatPreviewPanelBodyLazy = dynamic(
  () => import('@/components/chat/chat-preview-panel-body').then((m) => m.ChatPreviewPanelBody),
  {
    ssr: false,
    loading: () => <ChatPreviewPanelSkeleton className="h-full w-full" />,
  },
)

export type AgentChatPanelProps = {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
}

export function AgentChatPanel({ agentThreadId, locationId, analyticsRunId }: AgentChatPanelProps) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false)
  const { previewOpen, setPreviewOpen } = useChatPreviewVisibility()
  const previewPanelRef = usePanelRef()

  const handleThreadRotated = useCallback(
    (nextThreadId: string) => {
      router.replace(routes.agentThread(nextThreadId))
    },
    [router],
  )

  return (
    <AgentChatHost
      agentThreadId={agentThreadId}
      analyticsRunId={analyticsRunId}
      locationId={locationId}
      onThreadRotated={handleThreadRotated}
    >
      <ChatVisualizationsProvider
        analyticsRunId={analyticsRunId}
        locationId={locationId}
        storageKeyId={agentThreadId}
      >
        <ChatMentionProvider>
          <AgentChatPanelLayout
            mobileArtifactOpen={mobileArtifactOpen}
            onMobileArtifactOpenChange={setMobileArtifactOpen}
            previewOpen={previewOpen}
            previewPanelRef={previewPanelRef}
            setPreviewOpen={setPreviewOpen}
            storyArtifactHint={t('storyArtifact.ariaLabel')}
            storyArtifactTitle={t('storyArtifact.ariaLabel')}
          />
        </ChatMentionProvider>
      </ChatVisualizationsProvider>
    </AgentChatHost>
  )
}

type AgentChatPanelLayoutProps = {
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  previewOpen: boolean
  previewPanelRef: ReturnType<typeof usePanelRef>
  setPreviewOpen: ReturnType<typeof useChatPreviewVisibility>['setPreviewOpen']
  storyArtifactHint: string
  storyArtifactTitle: string
}

function AgentChatPanelLayout({
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewOpen,
  previewPanelRef,
  setPreviewOpen,
  storyArtifactHint,
  storyArtifactTitle,
}: AgentChatPanelLayoutProps) {
  const { chatMode } = useChatComposerState()
  const isDesktop = useDesktopLayout()
  const isImageAssistant = chatMode === 'image_assistant'
  const prevModeRef = useRef(chatMode)

  // Preview / mobile artifact live in the parent — cannot setState them during this render.
  useEffect(() => {
    if (chatMode === prevModeRef.current) return
    prevModeRef.current = chatMode
    if (chatMode === 'image_assistant') {
      setPreviewOpen(true)
    } else {
      setPreviewOpen(false)
      onMobileArtifactOpenChange(false)
    }
  }, [chatMode, onMobileArtifactOpenChange, setPreviewOpen])

  const chatPane = <ChatSidePanel />

  if (!isImageAssistant) {
    return <ChatOnlyLayout chatPane={chatPane} />
  }

  const previewPane = <ChatPreviewPanelBodyLazy />

  if (!isDesktop) {
    return (
      <ChatWithMobileArtifactLayout
        chatPane={chatPane}
        mobileArtifactHint={storyArtifactHint}
        mobileArtifactOpen={mobileArtifactOpen}
        mobileArtifactTitle={storyArtifactTitle}
        onMobileArtifactOpenChange={onMobileArtifactOpenChange}
        previewPane={previewPane}
      />
    )
  }

  if (!previewOpen) {
    return <ChatOnlyLayout chatPane={chatPane} />
  }

  return (
    <ChatWithPreviewLayout
      chatPane={chatPane}
      previewPane={previewPane}
      previewPanelRef={previewPanelRef}
    />
  )
}
