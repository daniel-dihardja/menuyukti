'use client'

import type { ComponentProps, ReactNode } from 'react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

import { WorkflowMobileChatSheet } from './workflow-mobile-chat-sheet'

export type WorkflowChatLayoutProps = {
  previewPanelRef: NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>
  timelinePane: ReactNode
  previewPane: ReactNode
  chatPane: ReactNode
  mobileChatOpen: boolean
  onMobileChatOpenChange: (open: boolean) => void
}

export function WorkflowChatLayout({
  previewPanelRef,
  timelinePane,
  previewPane,
  chatPane,
  mobileChatOpen,
  onMobileChatOpenChange,
}: WorkflowChatLayoutProps) {
  const isDesktop = useDesktopLayout()

  if (!isDesktop) {
    return (
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="min-h-0 flex-1 overflow-hidden">{timelinePane}</div>
        <WorkflowMobileChatSheet onOpenChange={onMobileChatOpenChange} open={mobileChatOpen}>
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
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {timelinePane}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            className="min-w-0"
            collapsible
            defaultSize={34}
            minSize={22}
            panelRef={previewPanelRef}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background p-2">
              {previewPane}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={28} minSize={20}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {chatPane}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
