'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { cn } from '@workspace/ui/lib/utils'

import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'

import { WorkflowChatPane } from './workflow-chat-pane'
import { WorkflowVisualizationsPane } from './workflow-visualizations-pane'

export type WorkflowSidePanelTab = 'chat' | 'visualizations'

function WorkflowChatOnly() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
      <WorkflowChatPane />
    </div>
  )
}

function WorkflowSidePanelAdminTabs() {
  const t = useTranslations('analytics.workflows.sidePanel')
  const [activeTab, setActiveTab] = useState<WorkflowSidePanelTab>('chat')

  return (
    <Tabs
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      onValueChange={(value) => setActiveTab(value as WorkflowSidePanelTab)}
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
          <WorkflowChatPane />
        </div>
      </TabsContent>

      <TabsContent className="mt-0 min-h-0 flex-1 overflow-y-auto" value="visualizations">
        {activeTab === 'visualizations' ? <WorkflowVisualizationsPane /> : null}
      </TabsContent>
    </Tabs>
  )
}

export function WorkflowSidePanel() {
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminTabs = isLoaded && isMenuyuktiAdmin(role)

  if (!showAdminTabs) {
    return <WorkflowChatOnly />
  }

  return <WorkflowSidePanelAdminTabs />
}
