'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef } from 'react'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import UploadExcelClient from '@/app/(protected)/analytics/sales/upload-xcel-client'
import { useUploadAnalytics } from '@/app/(protected)/analytics/sales/use-upload-analytics'
import { AdvisorChatKitPreview } from '@/components/chat/chatkit/advisor-chatkit-preview'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { ChatSalesReportSelect } from '@/components/chat/chat-sales-report-select'
import { ChatPreviewPanelSkeleton } from '@/components/chat/chat-workspace-skeleton'
import { useChatVisualizationsState } from '@/components/chat/visualizations/chat-visualizations-context'
import { useAnalyticsList } from '@/hooks/use-analytics-list'
import {
  defaultAdvisorWorkspaceTab,
  isAdvisorWorkspaceTabId,
  type AdvisorWorkspaceTabId,
} from '@/lib/chat/advisor-workspace-tabs'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { AdvisorWorkspaceCogsTab } from './advisor-workspace-cogs-tab'
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
  const salesReportsEnabled = isFeatureEnabled('salesReports')
  const { mutate: mutateAnalyticsList } = useAnalyticsList(locationId)
  const { uploadFile, uploading, status, message, pos } = useUploadAnalytics(
    locationId,
    (uploadedAnalyticsId) => {
      void mutateAnalyticsList()
      if (uploadedAnalyticsId != null) {
        setAnalyticsRunId(uploadedAnalyticsId)
      }
    },
  )

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
      ? ['story', 'venue', 'cogs']
      : ['insights', 'venue', 'cogs']
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
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
          <Field className="flex min-w-0 w-full max-w-none flex-1 basis-0 flex-col gap-1.5">
            <FieldLabel htmlFor="advisor-workspace-venue">{t('venueLabel')}</FieldLabel>
            <LocationSelect
              branches={branches}
              className="w-full max-w-none"
              id="advisor-workspace-venue"
              placeholder={t('venuePlaceholder')}
              triggerClassName="w-full max-w-none"
              value={locationId}
              variant="borderless"
              onValueChange={handleVenueChange}
            />
          </Field>
          <Field className="flex min-w-0 w-full max-w-none flex-1 basis-0 flex-col gap-1.5">
            <FieldLabel>{t('salesReportLabel')}</FieldLabel>
            <ChatSalesReportSelect
              className="w-full max-w-none"
              locationId={locationId}
              value={analyticsRunId}
              onValueChange={setAnalyticsRunId}
            />
          </Field>
          {salesReportsEnabled ? (
            <UploadExcelClient
              variant="compact"
              className="shrink-0"
              disabled={!locationId}
              uploading={uploading}
              status={status}
              message={null}
              pos={null}
              onFileSelected={uploadFile}
            />
          ) : null}
        </div>
        {salesReportsEnabled && message ? (
          <p
            role="status"
            aria-live={status === 'error' ? 'assertive' : 'polite'}
            className={`text-xs ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}
          >
            {message}
            {status === 'success' && pos ? ` · ${pos.toUpperCase()}` : null}
          </p>
        ) : null}
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
          <TabsTrigger value="cogs" className="min-h-8 touch-manipulation">
            {t('tabs.cogs')}
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
          value="cogs"
        >
          <AdvisorWorkspaceCogsTab activeAnalyticsRunId={analyticsRunId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
