'use client'

import type { ComponentProps, ReactNode } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@workspace/ui/components/sheet'

export type CampaignChatLayoutProps = {
  isDesktop: boolean
  previewOpen: boolean
  previewPanelRef: NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>
  onMobileSheetOpenChange: (open: boolean) => void
  timelinePane: ReactNode
  previewPane: ReactNode
  chatPane: ReactNode
  mobilePreviewTitle: string
}

export function CampaignChatLayout({
  isDesktop,
  previewOpen,
  previewPanelRef,
  onMobileSheetOpenChange,
  timelinePane,
  previewPane,
  chatPane,
  mobilePreviewTitle,
}: CampaignChatLayoutProps) {
  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden">
            <ResizablePanel defaultSize={isDesktop ? 40 : 40} minSize={isDesktop ? 28 : 22}>
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden pr-2">
                {timelinePane}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {isDesktop ? (
              <ResizablePanel
                className="bg-muted/20 p-3"
                collapsedSize={0}
                collapsible
                defaultSize={22}
                id="campaign-preview"
                minSize={16}
                panelRef={previewPanelRef}
              >
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  {previewPane}
                </div>
              </ResizablePanel>
            ) : null}

            {isDesktop ? <ResizableHandle withHandle /> : null}

            <ResizablePanel defaultSize={isDesktop ? 38 : 60} minSize={isDesktop ? 22 : 28}>
              <div className="relative flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
                {chatPane}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <Sheet onOpenChange={onMobileSheetOpenChange} open={!isDesktop && previewOpen}>
        <SheetContent
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{mobilePreviewTitle}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-3">{previewPane}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
