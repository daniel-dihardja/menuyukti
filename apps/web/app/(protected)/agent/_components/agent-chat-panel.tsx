'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

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
  onAnalyticsRunIdChange: (analyticsRunId: number | null) => void
}

export function AgentChatPanel({
  agentThreadId,
  locationId,
  analyticsRunId,
  onAnalyticsRunIdChange,
}: AgentChatPanelProps) {
  const t = useTranslations('chat')
  const router = useRouter()
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false)
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
      onAnalyticsRunIdChange={onAnalyticsRunIdChange}
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
            previewPanelRef={previewPanelRef}
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
  previewPanelRef: ReturnType<typeof usePanelRef>
  storyArtifactHint: string
  storyArtifactTitle: string
}

function GeneralAdvisorLayout() {
  return <ChatOnlyLayout chatPane={<ChatSidePanel />} />
}

function ImageAssistantDesktopLayout({
  previewPanelRef,
}: {
  previewPanelRef: ReturnType<typeof usePanelRef>
}) {
  return (
    <ChatWithPreviewLayout
      chatPane={<ChatSidePanel />}
      previewPane={<ChatPreviewPanelBodyLazy />}
      previewPanelRef={previewPanelRef}
    />
  )
}

function ImageAssistantMobileLayout({
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  storyArtifactHint,
  storyArtifactTitle,
}: {
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  storyArtifactHint: string
  storyArtifactTitle: string
}) {
  return (
    <ChatWithMobileArtifactLayout
      chatPane={<ChatSidePanel />}
      mobileArtifactHint={storyArtifactHint}
      mobileArtifactOpen={mobileArtifactOpen}
      mobileArtifactTitle={storyArtifactTitle}
      onMobileArtifactOpenChange={onMobileArtifactOpenChange}
      previewPane={<ChatPreviewPanelBodyLazy />}
    />
  )
}

function AgentChatPanelLayout({
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewPanelRef,
  storyArtifactHint,
  storyArtifactTitle,
}: AgentChatPanelLayoutProps) {
  const { chatMode } = useChatComposerState()
  const isDesktop = useDesktopLayout()

  // Close mobile artifact when leaving image assistant.
  useEffect(() => {
    if (chatMode !== 'image_assistant') {
      onMobileArtifactOpenChange(false)
    }
  }, [chatMode, onMobileArtifactOpenChange])

  if (chatMode !== 'image_assistant') {
    return <GeneralAdvisorLayout />
  }

  if (!isDesktop) {
    return (
      <ImageAssistantMobileLayout
        mobileArtifactOpen={mobileArtifactOpen}
        onMobileArtifactOpenChange={onMobileArtifactOpenChange}
        storyArtifactHint={storyArtifactHint}
        storyArtifactTitle={storyArtifactTitle}
      />
    )
  }

  return <ImageAssistantDesktopLayout previewPanelRef={previewPanelRef} />
}
