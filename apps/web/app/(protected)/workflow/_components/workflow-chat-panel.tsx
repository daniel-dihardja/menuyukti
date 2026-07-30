'use client'

import { usePanelRef } from '@workspace/ui/components/resizable'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { useWorkflowPreviewVisibility } from './use-workflow-preview-visibility'
import { useWorkflowChatComposerState } from './workflow-chat-context'
import { WorkflowChatHost } from './workflow-chat-host'
import { WorkflowChatLayout } from './workflow-chat-layout'
import { WorkflowChatMentionProvider } from './workflow-chat-mention-context'
import { WorkflowSidePanel } from './workflow-side-panel'
import { WorkflowVisualizationsProvider } from './workflow-visualizations-context'
import { WorkflowPreviewPanelSkeleton } from './workflow-workspace-skeleton'

const WorkflowPreviewPanelBodyLazy = dynamic(
  () => import('./workflow-preview-panel-body').then((m) => m.WorkflowPreviewPanelBody),
  {
    ssr: false,
    loading: () => <WorkflowPreviewPanelSkeleton className="h-full w-full" />,
  },
)

export type WorkflowChatPanelProps = {
  workflowId: string
  locationId: number
  analyticsRunId: number | null
}

export function WorkflowChatPanel({
  workflowId,
  locationId,
  analyticsRunId,
}: WorkflowChatPanelProps) {
  const t = useTranslations('analytics.workflows.chat')
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const { previewOpen, setPreviewOpen } = useWorkflowPreviewVisibility()
  const isDesktop = useDesktopLayout()
  const previewPanelRef = usePanelRef()

  return (
    <WorkflowChatHost
      analyticsRunId={analyticsRunId}
      locationId={locationId}
      onBusyChange={setChatBusy}
      workflowId={workflowId}
    >
      <WorkflowVisualizationsProvider
        analyticsRunId={analyticsRunId}
        locationId={locationId}
        workflowId={workflowId}
      >
        <WorkflowChatMentionProvider chatBusy={chatBusy}>
          <WorkflowChatPanelLayout
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
    </WorkflowChatHost>
  )
}

type WorkflowChatPanelLayoutProps = {
  isDesktop: boolean
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  previewOpen: boolean
  previewPanelRef: ReturnType<typeof usePanelRef>
  setPreviewOpen: ReturnType<typeof useWorkflowPreviewVisibility>['setPreviewOpen']
  storyArtifactHint: string
  storyArtifactTitle: string
}

function WorkflowChatPanelLayout({
  isDesktop,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  previewOpen,
  previewPanelRef,
  setPreviewOpen,
  storyArtifactHint,
  storyArtifactTitle,
}: WorkflowChatPanelLayoutProps) {
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
