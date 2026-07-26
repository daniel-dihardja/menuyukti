'use client'

import type { ComponentProps, ReactNode } from 'react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

import { WorkflowMobileArtifactProvider } from './workflow-mobile-artifact-context'
import { WorkflowMobileArtifactSheet } from './workflow-mobile-artifact-sheet'

export type WorkflowChatLayoutProps = {
  previewPanelRef: NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>
  /** @deprecated Milestones column is hidden in the UI; prop kept for call-site compatibility. */
  timelinePane?: ReactNode
  previewPane: ReactNode
  chatPane: ReactNode
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  /** Optional mobile artifact sheet title (e.g. selected milestone). */
  mobileArtifactTitle?: string | null
  /** Optional mobile artifact open-button hint / tooltip. */
  mobileArtifactHint?: string | null
}

export function WorkflowChatLayout({
  previewPanelRef,
  previewPane,
  chatPane,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  mobileArtifactTitle,
  mobileArtifactHint,
}: WorkflowChatLayoutProps) {
  const isDesktop = useDesktopLayout()

  if (!isDesktop) {
    return (
      <WorkflowMobileArtifactProvider
        hint={mobileArtifactHint}
        openArtifact={() => onMobileArtifactOpenChange(true)}
      >
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{chatPane}</div>
          <WorkflowMobileArtifactSheet
            onOpenChange={onMobileArtifactOpenChange}
            open={mobileArtifactOpen}
            title={mobileArtifactTitle}
          >
            {previewPane}
          </WorkflowMobileArtifactSheet>
        </div>
      </WorkflowMobileArtifactProvider>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden">
          <ResizablePanel defaultSize={33} minSize={22}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {chatPane}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            className="min-w-0"
            collapsible
            defaultSize={67}
            minSize={40}
            panelRef={previewPanelRef}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background p-2">
              {previewPane}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
