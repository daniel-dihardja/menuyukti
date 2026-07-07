'use client'

import type { ReactNode } from 'react'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

export type PostCreatorLayoutProps = {
  thumbnailsPane: ReactNode
  previewPane: ReactNode
  chatPane: ReactNode
}

export function PostCreatorLayout({
  thumbnailsPane,
  previewPane,
  chatPane,
}: PostCreatorLayoutProps) {
  const isDesktop = useDesktopLayout()

  if (!isDesktop) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="min-h-[12rem] flex-1 overflow-hidden rounded-lg border">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
            {previewPane}
          </div>
        </div>
        <div className="min-h-[8rem] overflow-hidden rounded-lg border">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
            {thumbnailsPane}
          </div>
        </div>
        <div className="min-h-[12rem] flex-1 overflow-hidden rounded-lg border">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
            {chatPane}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden">
          <ResizablePanel defaultSize={25} minSize={18}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {thumbnailsPane}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel className="min-w-0" defaultSize={45} minSize={30}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {previewPane}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
              {chatPane}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
