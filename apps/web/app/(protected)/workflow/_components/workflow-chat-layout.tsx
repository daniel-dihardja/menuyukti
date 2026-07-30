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
  /** When false, chat is full-width / centered with no artifact panel. */
  showPreview: boolean
  previewPane: ReactNode
  chatPane: ReactNode
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  mobileArtifactTitle?: string | null
  mobileArtifactHint?: string | null
}

export function WorkflowChatLayout({
  previewPanelRef,
  showPreview,
  previewPane,
  chatPane,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  mobileArtifactTitle,
  mobileArtifactHint,
}: WorkflowChatLayoutProps) {
  const isDesktop = useDesktopLayout()

  if (!showPreview) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
          {chatPane}
        </div>
      </div>
    )
  }

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
