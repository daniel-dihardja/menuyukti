'use client'

import type { ComponentProps, ReactNode } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

export type WorkflowChatLayoutProps = {
  isDesktop: boolean
  previewPanelRef: NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>
  timelinePane: ReactNode
  previewPane: ReactNode
  chatPane: ReactNode
}

export function WorkflowChatLayout({
  isDesktop,
  previewPanelRef,
  timelinePane,
  previewPane,
  chatPane,
}: WorkflowChatLayoutProps) {
  if (!isDesktop) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {timelinePane}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden">
          <ResizablePanel defaultSize={40} minSize={28}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden pr-2">
              {timelinePane}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            className="bg-muted/20 p-3"
            collapsedSize={0}
            collapsible
            defaultSize={22}
            id="workflow-preview"
            minSize={16}
            panelRef={previewPanelRef}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              {previewPane}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={38} minSize={22}>
            <div className="relative flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
              {chatPane}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
