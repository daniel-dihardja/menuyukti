'use client'

import type { ComponentProps, CSSProperties, ReactNode } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'

import { ChatMobileArtifactProvider } from '@/components/chat/chat-mobile-artifact-context'
import { ChatMobileArtifactSheet } from '@/components/chat/chat-mobile-artifact-sheet'
import {
  ChatViewportInsetProvider,
  useChatViewportInset,
} from '@/components/chat/chat-viewport-inset-context'

type PreviewPanelRef = NonNullable<ComponentProps<typeof ResizablePanel>['panelRef']>

function ChatColumnWithKeyboardInset({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { bottomInset } = useChatViewportInset()
  const style: CSSProperties | undefined =
    bottomInset > 0 ? { paddingBottom: bottomInset } : undefined

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

export function ChatOnlyLayout({ chatPane }: { chatPane: ReactNode }) {
  return (
    <ChatViewportInsetProvider>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ChatColumnWithKeyboardInset className="mx-auto flex h-full min-h-0 w-full max-w-3xl min-w-0 flex-1 flex-col overflow-hidden bg-background lg:rounded-lg lg:border">
          {chatPane}
        </ChatColumnWithKeyboardInset>
      </div>
    </ChatViewportInsetProvider>
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
    <ChatViewportInsetProvider>
      <ChatMobileArtifactProvider
        hint={mobileArtifactHint}
        openArtifact={() => onMobileArtifactOpenChange(true)}
      >
        <ChatColumnWithKeyboardInset className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{chatPane}</div>
          <ChatMobileArtifactSheet
            onOpenChange={onMobileArtifactOpenChange}
            open={mobileArtifactOpen}
            title={mobileArtifactTitle}
          >
            {previewPane}
          </ChatMobileArtifactSheet>
        </ChatColumnWithKeyboardInset>
      </ChatMobileArtifactProvider>
    </ChatViewportInsetProvider>
  )
}

export const ChatLayout = {
  ChatOnly: ChatOnlyLayout,
  WithPreview: ChatWithPreviewLayout,
  WithMobileArtifact: ChatWithMobileArtifactLayout,
}
