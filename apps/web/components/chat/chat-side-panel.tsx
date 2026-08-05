'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3 } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Button } from '@workspace/ui/components/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import { cn } from '@workspace/ui/lib/utils'

import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'

import { ChatPane } from '@/components/chat/chat-pane'

const ChatVisualizationsPane = dynamic(
  () =>
    import('@/components/chat/visualizations/chat-visualizations-pane').then(
      (m) => m.ChatVisualizationsPane,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        <div className="bg-muted h-48 animate-pulse rounded-lg border" />
      </div>
    ),
  },
)

export type ChatSidePanelTab = 'chat' | 'visualizations'

function ChatOnlyPanel() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
      <ChatPane />
    </div>
  )
}

function ChatSidePanelAdminDesktopTabs() {
  const t = useTranslations('chat.sidePanel')
  const [activeTab, setActiveTab] = useState<ChatSidePanelTab>('chat')

  return (
    <Tabs
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      onValueChange={(value) => setActiveTab(value as ChatSidePanelTab)}
      value={activeTab}
    >
      <TabsList
        className="h-auto w-full shrink-0 justify-start rounded-none border-b bg-transparent px-2 pt-2"
        variant="line"
      >
        <TabsTrigger className="shrink-0" value="chat">
          {t('chatTab')}
        </TabsTrigger>
        <TabsTrigger className="shrink-0" value="visualizations">
          {t('visualizationsTab')}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        className={cn(
          'mt-0 min-h-0 flex-1 overflow-hidden',
          activeTab === 'chat' ? 'flex flex-col' : 'overflow-y-auto',
        )}
        value="chat"
      >
        <div className="flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
          <ChatPane />
        </div>
      </TabsContent>

      <TabsContent className="mt-0 min-h-0 flex-1 overflow-y-auto" value="visualizations">
        {activeTab === 'visualizations' ? <ChatVisualizationsPane /> : null}
      </TabsContent>
    </Tabs>
  )
}

function ChatSidePanelAdminCompact() {
  const t = useTranslations('chat.sidePanel')
  const [vizOpen, setVizOpen] = useState(false)
  const openButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
      <ChatPane />
      <Button
        ref={openButtonRef}
        aria-label={t('openVisualizationsAria')}
        className="absolute top-3 right-3 z-10 size-11 touch-manipulation shadow-sm"
        onClick={() => setVizOpen(true)}
        size="icon"
        type="button"
        variant="outline"
      >
        <BarChart3 aria-hidden />
      </Button>
      <Drawer
        onOpenChange={(open) => {
          setVizOpen(open)
          if (!open) {
            openButtonRef.current?.focus()
          }
        }}
        open={vizOpen}
      >
        <DrawerContent
          className={cn(
            'flex h-[min(92dvh,900px)] max-h-[min(92dvh,900px)] flex-col gap-0',
            'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
            'overscroll-contain',
          )}
        >
          <DrawerHeader className="shrink-0 gap-1 px-4 pt-1 pb-2 text-left">
            <DrawerTitle className="text-sm">{t('visualizationsTab')}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t('visualizationsDrawerDescription')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {vizOpen ? <ChatVisualizationsPane /> : null}
          </div>
          <div className="shrink-0 border-t px-4 py-3">
            <DrawerClose asChild>
              <Button className="h-11 w-full touch-manipulation" type="button" variant="outline">
                {t('closeVisualizations')}
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function ChatSidePanelAdmin() {
  const compact = useCompactLayout()
  if (compact) {
    return <ChatSidePanelAdminCompact />
  }
  return <ChatSidePanelAdminDesktopTabs />
}

export function ChatSidePanel() {
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminTabs = isLoaded && isMenuyuktiAdmin(role)

  if (!showAdminTabs) {
    return <ChatOnlyPanel />
  }

  return <ChatSidePanelAdmin />
}
