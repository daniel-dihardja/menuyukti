'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef } from 'react'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { AdvisorChatKitPreview } from '@/components/chat/chatkit/advisor-chatkit-preview'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { ChatSalesReportSelect } from '@/components/chat/chat-sales-report-select'
import { ChatPreviewPanelSkeleton } from '@/components/chat/chat-workspace-skeleton'
import { useChatVisualizationsState } from '@/components/chat/visualizations/chat-visualizations-context'
import {
  defaultAdvisorWorkspaceTab,
  isAdvisorWorkspaceTabId,
  type AdvisorWorkspaceTabId,
} from '@/lib/chat/advisor-workspace-tabs'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { AdvisorWorkspaceReportsTab } from './advisor-workspace-reports-tab'
import { AdvisorWorkspaceVenueTab } from './advisor-workspace-venue-tab'

const ChatVisualizationsPaneLazy = dynamic(
  () =>
    import('@/components/chat/visualizations/chat-visualizations-pane').then(
      (m) => m.ChatVisualizationsPane,
    ),
  {
    ssr: false,
    loading: () => <ChatPreviewPanelSkeleton className="h-full w-full" />,
  },
)

export function AdvisorWorkspaceRail() {
  const t = useTranslations('chat.workspace')
  const {
    locationId,
    setLocationId,
    analyticsRunId,
    setAnalyticsRunId,
    branches,
    workspaceTab,
    setWorkspaceTab,
    chatMode,
  } = useAdvisorChatKitShell()
  const { addedIds, hydrated } = useChatVisualizationsState()
  const prevAddedCountRef = useRef<number | null>(null)

  const isImage = chatMode === 'image_assistant'

  useEffect(() => {
    if (!hydrated) return
    if (prevAddedCountRef.current === null) {
      prevAddedCountRef.current = addedIds.length
      return
    }
    if (addedIds.length > prevAddedCountRef.current && !isImage) {
      setWorkspaceTab('insights')
    }
    prevAddedCountRef.current = addedIds.length
  }, [addedIds.length, hydrated, isImage, setWorkspaceTab])

  useEffect(() => {
    const allowed: AdvisorWorkspaceTabId[] = isImage
      ? ['story', 'venue', 'reports']
      : ['insights', 'venue', 'reports']
    if (!allowed.includes(workspaceTab)) {
      setWorkspaceTab(defaultAdvisorWorkspaceTab(chatMode))
    }
  }, [chatMode, isImage, setWorkspaceTab, workspaceTab])

  const handleVenueChange = useCallback(
    (nextId: number | null) => {
      if (nextId === null || nextId === locationId) return
      setLocationId(nextId)
    },
    [locationId, setLocationId],
  )

  const handleTabChange = useCallback(
    (value: string) => {
      if (isAdvisorWorkspaceTabId(value)) {
        setWorkspaceTab(value)
      }
    },
    [setWorkspaceTab],
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border p-3">
        <Field className="flex w-full max-w-none flex-col gap-1.5">
          <FieldLabel htmlFor="advisor-workspace-venue">{t('venueLabel')}</FieldLabel>
          <LocationSelect
            branches={branches}
            className="w-full max-w-none"
            id="advisor-workspace-venue"
            placeholder={t('venuePlaceholder')}
            value={locationId}
            onValueChange={handleVenueChange}
          />
        </Field>
        <Field className="flex w-full max-w-none flex-col gap-1.5">
          <FieldLabel>{t('salesReportLabel')}</FieldLabel>
          <ChatSalesReportSelect
            className="w-full max-w-none"
            locationId={locationId}
            value={analyticsRunId}
            onValueChange={setAnalyticsRunId}
          />
        </Field>
      </div>

      <Tabs
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        value={workspaceTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="mx-3 mt-2 h-10 w-auto shrink-0 justify-start self-start">
          {isImage ? (
            <TabsTrigger value="story" className="min-h-8 touch-manipulation">
              {t('tabs.story')}
            </TabsTrigger>
          ) : (
            <TabsTrigger value="insights" className="min-h-8 touch-manipulation">
              {t('tabs.insights')}
            </TabsTrigger>
          )}
          <TabsTrigger value="venue" className="min-h-8 touch-manipulation">
            {t('tabs.venue')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="min-h-8 touch-manipulation">
            {t('tabs.reports')}
          </TabsTrigger>
        </TabsList>

        {isImage ? (
          <TabsContent
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            forceMount
            value="story"
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <AdvisorChatKitPreview />
            </div>
          </TabsContent>
        ) : (
          <TabsContent
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            forceMount
            value="insights"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ChatVisualizationsPaneLazy />
            </div>
          </TabsContent>
        )}

        <TabsContent
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          value="venue"
        >
          <AdvisorWorkspaceVenueTab locationId={locationId} />
        </TabsContent>

        <TabsContent
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          value="reports"
        >
          <AdvisorWorkspaceReportsTab
            activeAnalyticsRunId={analyticsRunId}
            locationId={locationId}
            onActivateRun={setAnalyticsRunId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
