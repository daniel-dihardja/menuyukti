'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { useChatPreviewVisibility } from '@/components/chat/use-chat-preview-visibility'
import { useChatComposerState } from '@/components/chat/chat-context'
import { ChatLayout } from '@/components/chat/chat-layout'
import { ChatMentionProvider } from '@/components/chat/chat-mention-context'
import { ChatSidePanel } from '@/components/chat/chat-side-panel'
import { ChatVisualizationsProvider } from '@/components/chat/visualizations/chat-visualizations-context'
import { ChatPreviewPanelSkeleton } from '@/components/chat/chat-workspace-skeleton'
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
  const [chatBusy, setChatBusy] = useState(false)
  const { previewOpen, setPreviewOpen } = useChatPreviewVisibility()
  const isDesktop = useDesktopLayout()
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
      onBusyChange={setChatBusy}
      onThreadRotated={handleThreadRotated}
    >
      <ChatVisualizationsProvider
        analyticsRunId={analyticsRunId}
        locationId={locationId}
        storageKeyId={agentThreadId}
      >
        <ChatMentionProvider chatBusy={chatBusy}>
          <AgentChatPanelLayout
            isDesktop={isDesktop}
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
  isDesktop: boolean
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  previewOpen: boolean
  previewPanelRef: ReturnType<typeof usePanelRef>
  setPreviewOpen: ReturnType<typeof useChatPreviewVisibility>['setPreviewOpen']
  storyArtifactHint: string
  storyArtifactTitle: string
}

function AgentChatPanelLayout({
  isDesktop,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewOpen,
  previewPanelRef,
  setPreviewOpen,
  storyArtifactHint,
  storyArtifactTitle,
}: AgentChatPanelLayoutProps) {
  const { chatMode } = useChatComposerState()
  const showPreview = chatMode === 'story_image_assistant'

  useEffect(() => {
    if (showPreview) {
      setPreviewOpen(true)
      if (!isDesktop) {
        onMobileArtifactOpenChange(true)
      }
      return
    }
    setPreviewOpen(false)
    onMobileArtifactOpenChange(false)
  }, [showPreview, isDesktop, setPreviewOpen, onMobileArtifactOpenChange])

  return (
    <ChatLayout
      chatPane={<ChatSidePanel />}
      mobileArtifactHint={storyArtifactHint}
      mobileArtifactOpen={mobileArtifactOpen}
      mobileArtifactTitle={storyArtifactTitle}
      onMobileArtifactOpenChange={onMobileArtifactOpenChange}
      previewPane={showPreview ? <ChatPreviewPanelBodyLazy /> : null}
      previewPanelRef={previewPanelRef}
      showPreview={showPreview && previewOpen}
    />
  )
}
