'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { useWorkflowPreviewVisibility } from '@/app/(protected)/workflow/_components/use-workflow-preview-visibility'
import { useWorkflowChatComposerState } from '@/app/(protected)/workflow/_components/workflow-chat-context'
import { WorkflowChatLayout } from '@/app/(protected)/workflow/_components/workflow-chat-layout'
import { WorkflowChatMentionProvider } from '@/app/(protected)/workflow/_components/workflow-chat-mention-context'
import { WorkflowSidePanel } from '@/app/(protected)/workflow/_components/workflow-side-panel'
import { WorkflowVisualizationsProvider } from '@/app/(protected)/workflow/_components/workflow-visualizations-context'
import { WorkflowPreviewPanelSkeleton } from '@/app/(protected)/workflow/_components/workflow-workspace-skeleton'
import { routes } from '@/lib/routes'

import { AgentChatHost } from './agent-chat-host'

const WorkflowPreviewPanelBodyLazy = dynamic(
  () =>
    import('@/app/(protected)/workflow/_components/workflow-preview-panel-body').then(
      (m) => m.WorkflowPreviewPanelBody,
    ),
  {
    ssr: false,
    loading: () => <WorkflowPreviewPanelSkeleton className="h-full w-full" />,
  },
)

export type AgentChatPanelProps = {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
}

export function AgentChatPanel({ agentThreadId, locationId, analyticsRunId }: AgentChatPanelProps) {
  const t = useTranslations('analytics.workflows.chat')
  const router = useRouter()
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const { previewOpen, setPreviewOpen } = useWorkflowPreviewVisibility()
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
      <WorkflowVisualizationsProvider
        analyticsRunId={analyticsRunId}
        locationId={locationId}
        storageKeyId={agentThreadId}
      >
        <WorkflowChatMentionProvider chatBusy={chatBusy}>
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
        </WorkflowChatMentionProvider>
      </WorkflowVisualizationsProvider>
    </AgentChatHost>
  )
}

type AgentChatPanelLayoutProps = {
  isDesktop: boolean
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  previewOpen: boolean
  previewPanelRef: ReturnType<typeof usePanelRef>
  setPreviewOpen: ReturnType<typeof useWorkflowPreviewVisibility>['setPreviewOpen']
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
  const { chatMode } = useWorkflowChatComposerState()
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
    <WorkflowChatLayout
      chatPane={<WorkflowSidePanel />}
      mobileArtifactHint={storyArtifactHint}
      mobileArtifactOpen={mobileArtifactOpen}
      mobileArtifactTitle={storyArtifactTitle}
      onMobileArtifactOpenChange={onMobileArtifactOpenChange}
      previewPane={showPreview ? <WorkflowPreviewPanelBodyLazy /> : null}
      previewPanelRef={previewPanelRef}
      showPreview={showPreview && previewOpen}
    />
  )
}
