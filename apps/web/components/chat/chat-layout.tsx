'use client'

import type { ComponentProps, ReactNode } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

import { ChatMobileArtifactProvider } from '@/components/chat/chat-mobile-artifact-context'
import { ChatMobileArtifactSheet } from '@/components/chat/chat-mobile-artifact-sheet'

type PreviewPanelRef = NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>

export function ChatOnlyLayout({ chatPane }: { chatPane: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        {chatPane}
      </div>
    </div>
  )
}

export function ChatWithPreviewLayout({
  chatPane,
  previewPane,
  previewPanelRef,
}: {
  chatPane: ReactNode
  previewPane: ReactNode
  previewPanelRef: PreviewPanelRef
}) {
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

export function ChatWithMobileArtifactLayout({
  chatPane,
  previewPane,
  mobileArtifactOpen,
  onMobileArtifactOpenChange,
  mobileArtifactTitle,
  mobileArtifactHint,
}: {
  chatPane: ReactNode
  previewPane: ReactNode
  mobileArtifactOpen: boolean
  onMobileArtifactOpenChange: (open: boolean) => void
  mobileArtifactTitle?: string | null
  mobileArtifactHint?: string | null
}) {
  return (
    <ChatMobileArtifactProvider
      hint={mobileArtifactHint}
      openArtifact={() => onMobileArtifactOpenChange(true)}
    >
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{chatPane}</div>
        <ChatMobileArtifactSheet
          onOpenChange={onMobileArtifactOpenChange}
          open={mobileArtifactOpen}
          title={mobileArtifactTitle}
        >
          {previewPane}
        </ChatMobileArtifactSheet>
      </div>
    </ChatMobileArtifactProvider>
  )
}

export const ChatLayout = {
  ChatOnly: ChatOnlyLayout,
  WithPreview: ChatWithPreviewLayout,
  WithMobileArtifact: ChatWithMobileArtifactLayout,
}
