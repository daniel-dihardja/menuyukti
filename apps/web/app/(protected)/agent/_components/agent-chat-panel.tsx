'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { useChatComposerState } from '@/components/chat/chat-context'
import {
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

const ChatVisualizationsPaneLazy = dynamic(
  () =>
    import('@/components/chat/visualizations/chat-visualizations-pane').then(
      (m) => m.ChatVisualizationsPane,
    ),
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
  const tViz = useTranslations('chat.visualizations')
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
            chartsArtifactDescription={tViz('artifactDescription')}
            chartsArtifactHint={tViz('artifactHint')}
            chartsArtifactTitle={tViz('artifactTitle')}
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
  chartsArtifactDescription: string
  chartsArtifactHint: string
  chartsArtifactTitle: string
  storyArtifactHint: string
  storyArtifactTitle: string
}

function ModeDesktopLayout({
  previewPane,
  previewPanelRef,
}: {
  previewPane: ReactNode
  previewPanelRef: ReturnType<typeof usePanelRef>
}) {
  return (
    <ChatWithPreviewLayout
      chatPane={<ChatSidePanel />}
      previewPane={previewPane}
      previewPanelRef={previewPanelRef}
    />
  )
}

function ModeMobileLayout({
  previewPane,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  artifactDescription,
  artifactHint,
  artifactTitle,
}: {
  previewPane: ReactNode
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  artifactDescription?: string | null
  artifactHint: string
  artifactTitle: string
}) {
  return (
    <ChatWithMobileArtifactLayout
      chatPane={<ChatSidePanel />}
      mobileArtifactDescription={artifactDescription}
      mobileArtifactHint={artifactHint}
      mobileArtifactOpen={mobileArtifactOpen}
      mobileArtifactTitle={artifactTitle}
      onMobileArtifactOpenChange={onMobileArtifactOpenChange}
      previewPane={previewPane}
    />
  )
}

function AgentChatPanelLayout({
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewPanelRef,
  chartsArtifactDescription,
  chartsArtifactHint,
  chartsArtifactTitle,
  storyArtifactHint,
  storyArtifactTitle,
}: AgentChatPanelLayoutProps) {
  const { chatMode } = useChatComposerState()
  const isDesktop = useDesktopLayout()

  // Close mobile artifact when switching modes.
  useEffect(() => {
    onMobileArtifactOpenChange(false)
  }, [chatMode, onMobileArtifactOpenChange])

  const isImageAssistant = chatMode === 'image_assistant'
  const previewPane = isImageAssistant ? (
    <ChatPreviewPanelBodyLazy />
  ) : (
    <ChatVisualizationsPaneLazy />
  )
  const artifactHint = isImageAssistant ? storyArtifactHint : chartsArtifactHint
  const artifactTitle = isImageAssistant ? storyArtifactTitle : chartsArtifactTitle
  const artifactDescription = isImageAssistant ? null : chartsArtifactDescription

  if (!isDesktop) {
    return (
      <ModeMobileLayout
        artifactDescription={artifactDescription}
        artifactHint={artifactHint}
        artifactTitle={artifactTitle}
        mobileArtifactOpen={mobileArtifactOpen}
        onMobileArtifactOpenChange={onMobileArtifactOpenChange}
        previewPane={previewPane}
      />
    )
  }

  return <ModeDesktopLayout previewPane={previewPane} previewPanelRef={previewPanelRef} />
}
