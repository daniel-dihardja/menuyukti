'use client'

import type { ComponentProps, ReactNode } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

import { WorkflowMobileChatSheet } from './workflow-mobile-chat-sheet'

export type WorkflowChatLayoutProps = {
  isDesktop: boolean
  previewPanelRef: NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>
  timelinePane: ReactNode
  previewPane: ReactNode
  chatPane: ReactNode
  mobileChatOpen: boolean
  onMobileChatOpenChange: (open: boolean) => void
  isChatBusy: boolean
  hasChatMessages: boolean
}

export function WorkflowChatLayout({
  isDesktop,
  previewPanelRef,
  timelinePane,
  previewPane,
  chatPane,
  mobileChatOpen,
  onMobileChatOpenChange,
  isChatBusy,
  hasChatMessages,
}: WorkflowChatLayoutProps) {
  if (!isDesktop) {
    return (
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted dark:bg-background">
        <div className="min-h-0 flex-1 overflow-hidden">{timelinePane}</div>
        <WorkflowMobileChatSheet
          hasMessages={hasChatMessages}
          isChatBusy={isChatBusy}
          onOpenChange={onMobileChatOpenChange}
          open={mobileChatOpen}
        >
          {chatPane}
        </WorkflowMobileChatSheet>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden">
          <ResizablePanel defaultSize={38} minSize={28}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted dark:bg-background">
              {timelinePane}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            className="bg-muted/20 p-3"
            collapsedSize={0}
            collapsible
            defaultSize={34}
            id="workflow-preview"
            minSize={20}
            panelRef={previewPanelRef}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              {previewPane}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={28} minSize={20}>
            <div className="relative flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
              {chatPane}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
