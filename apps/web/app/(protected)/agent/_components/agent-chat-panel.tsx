'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { AdvisorWorkspaceRail } from '@/components/chat/advisor-workspace-rail'
import { AdvisorChatPane } from '@/components/chat/advisor-chat-pane'
import { AdvisorCopilotKitShellBridge } from '@/components/chat/copilotkit/advisor-copilotkit-shell-bridge'
import {
  AdvisorChatKitShellProvider,
  type AdvisorBranchOption,
  useAdvisorChatKitShell,
} from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { ChatWithMobileArtifactLayout, ChatWithPreviewLayout } from '@/components/chat/chat-layout'
import { ChatVisualizationsProvider } from '@/components/chat/visualizations/chat-visualizations-context'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { routes } from '@/lib/routes'

export type AgentChatPanelProps = {
  agentThreadId: string
  locationId: number
  onLocationIdChange: (locationId: number) => void
  analyticsRunId: number | null
  onAnalyticsRunIdChange: (analyticsRunId: number | null) => void
  branches: AdvisorBranchOption[]
}

export function AgentChatPanel({
  agentThreadId,
  locationId,
  onLocationIdChange,
  analyticsRunId,
  onAnalyticsRunIdChange,
  branches,
}: AgentChatPanelProps) {
  const t = useTranslations('chat.workspace')
  const router = useRouter()
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false)
  const previewPanelRef = usePanelRef()

  const handleThreadRotated = useCallback(
    (nextThreadId: string) => {
      router.replace(routes.agentThread(nextThreadId))
    },
    [router],
  )

  const handleOpenMobileWorkspace = useCallback(() => {
    setMobileArtifactOpen(true)
  }, [])

  return (
    <AdvisorChatKitShellProvider
      agentThreadId={agentThreadId}
      analyticsRunId={analyticsRunId}
      branches={branches}
      locationId={locationId}
      onAnalyticsRunIdChange={onAnalyticsRunIdChange}
      onLocationIdChange={onLocationIdChange}
      onOpenMobileWorkspace={handleOpenMobileWorkspace}
      onThreadRotated={handleThreadRotated}
    >
      <ChatVisualizationsProvider
        analyticsRunId={analyticsRunId}
        locationId={locationId}
        storageKeyId={agentThreadId}
      >
        <AdvisorCopilotKitShellBridge>
          <AgentChatPanelLayout
            mobileArtifactDescription={t('mobileSheetDescription')}
            mobileArtifactHint={t('mobileSheetHint')}
            mobileArtifactOpen={mobileArtifactOpen}
            mobileArtifactTitle={t('mobileSheetTitle')}
            onMobileArtifactOpenChange={setMobileArtifactOpen}
            previewPanelRef={previewPanelRef}
          />
        </AdvisorCopilotKitShellBridge>
      </ChatVisualizationsProvider>
    </AdvisorChatKitShellProvider>
  )
}

type AgentChatPanelLayoutProps = {
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  previewPanelRef: ReturnType<typeof usePanelRef>
  mobileArtifactDescription: string
  mobileArtifactHint: string
  mobileArtifactTitle: string
}

function AgentChatPanelLayout({
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewPanelRef,
  mobileArtifactDescription,
  mobileArtifactHint,
  mobileArtifactTitle,
}: AgentChatPanelLayoutProps) {
  const { chatMode } = useAdvisorChatKitShell()
  const isDesktop = useDesktopLayout()

  useEffect(() => {
    onMobileArtifactOpenChange(false)
  }, [chatMode, onMobileArtifactOpenChange])

  const previewPane = <AdvisorWorkspaceRail />

  if (!isDesktop) {
    return (
      <ChatWithMobileArtifactLayout
        chatPane={<AdvisorChatPane />}
        mobileArtifactDescription={mobileArtifactDescription}
        mobileArtifactHint={mobileArtifactHint}
        mobileArtifactOpen={mobileArtifactOpen}
        mobileArtifactTitle={mobileArtifactTitle}
        onMobileArtifactOpenChange={onMobileArtifactOpenChange}
        previewPane={previewPane}
      />
    )
  }

  return (
    <ChatWithPreviewLayout
      chatPane={<AdvisorChatPane />}
      previewPane={previewPane}
      previewPanelRef={previewPanelRef}
    />
  )
}
