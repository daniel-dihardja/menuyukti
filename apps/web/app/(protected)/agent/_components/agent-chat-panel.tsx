'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { AdvisorChatKit } from '@/components/chat/chatkit/advisor-chatkit'
import { AdvisorChatKitPreview } from '@/components/chat/chatkit/advisor-chatkit-preview'
import {
  AdvisorChatKitShellProvider,
  useAdvisorChatKitShell,
} from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { ChatWithMobileArtifactLayout, ChatWithPreviewLayout } from '@/components/chat/chat-layout'
import { ChatVisualizationsProvider } from '@/components/chat/visualizations/chat-visualizations-context'
import { ChatPreviewPanelSkeleton } from '@/components/chat/chat-workspace-skeleton'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { routes } from '@/lib/routes'

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
    <AdvisorChatKitShellProvider
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
      </ChatVisualizationsProvider>
    </AdvisorChatKitShellProvider>
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
      chatPane={<AdvisorChatKit />}
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
      chatPane={<AdvisorChatKit />}
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
  const { chatMode } = useAdvisorChatKitShell()
  const isDesktop = useDesktopLayout()

  useEffect(() => {
    onMobileArtifactOpenChange(false)
  }, [chatMode, onMobileArtifactOpenChange])

  const isImageAssistant = chatMode === 'image_assistant'
  const previewPane = isImageAssistant ? <AdvisorChatKitPreview /> : <ChatVisualizationsPaneLazy />
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
