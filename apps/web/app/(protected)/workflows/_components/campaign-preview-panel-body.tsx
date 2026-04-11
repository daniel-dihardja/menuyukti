'use client'

import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  MarkdownEditField,
  type MarkdownEditFieldManualSave,
} from '@/components/markdown-edit-field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { useTimelineActions, useTimelineWorkspaceState } from './timeline-context'

const PREVIEW_TITLE_ID = 'campaign-preview-panel-title'

export function CampaignPreviewPanelBody() {
  const t = useTranslations('analytics.campaigns.chat')
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const {
    milestoneState: { milestones, savingDataMilestoneId },
  } = useTimelineWorkspaceState()
  const { onHydrateMilestoneData, onUpdateMilestoneData } = useTimelineActions()
  const [selectedId] = useQueryState('milestone', parseAsString)

  const selectedMilestone =
    selectedId !== null ? milestones.find((m) => m.id === selectedId) : undefined
  const showMilestonePreview = selectedMilestone !== undefined
  const savingData = showMilestonePreview && savingDataMilestoneId === selectedMilestone.id

  const [dataDraft, setDataDraft] = useState('')

  /** Single source from list so RESET / refetches update the draft even when the object reference was stale. */
  const milestoneDataFromList = useMemo(() => {
    if (selectedId == null) {
      return ''
    }
    return milestones.find((m) => m.id === selectedId)?.data ?? ''
  }, [milestones, selectedId])

  useLayoutEffect(() => {
    setDataDraft(milestoneDataFromList)
  }, [milestoneDataFromList])

  const hydrateAttempted = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (selectedId == null) {
      return
    }
    const row = milestones.find((m) => m.id === selectedId)
    if (!row) {
      return
    }
    if ((row.data ?? '').trim().length > 0) {
      return
    }
    if (hydrateAttempted.current.has(selectedId)) {
      return
    }
    hydrateAttempted.current.add(selectedId)
    void onHydrateMilestoneData(selectedId)
  }, [selectedId, milestones, onHydrateMilestoneData])

  const handleDataSave = useCallback(() => {
    if (!selectedMilestone || savingData) {
      return
    }
    const server = selectedMilestone.data ?? ''
    if (dataDraft === server) {
      return
    }
    void (async () => {
      const ok = await onUpdateMilestoneData(selectedMilestone.id, dataDraft)
      if (!ok) {
        setDataDraft(server)
      }
    })()
  }, [selectedMilestone, dataDraft, savingData, onUpdateMilestoneData])

  const dataSaveStatus = savingData
    ? 'saving'
    : selectedMilestone && dataDraft !== (selectedMilestone.data ?? '')
      ? 'unsaved'
      : 'saved'

  const saveStatusMessages = useMemo(
    () => ({
      saving: t('fieldSaveStatusSaving'),
      saved: t('fieldSaveStatusSaved'),
      unsaved: t('fieldSaveStatusUnsaved'),
    }),
    [t],
  )

  const dataManualSave = useMemo(
    (): MarkdownEditFieldManualSave => ({
      messages: saveStatusMessages,
      onSave: handleDataSave,
      status: dataSaveStatus,
    }),
    [dataSaveStatus, handleDataSave, saveStatusMessages],
  )

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base" id={PREVIEW_TITLE_ID}>
          {tWorkspace('previewTitle')}
        </CardTitle>
        <CardDescription className="text-pretty">
          {tWorkspace('previewDescription')}
        </CardDescription>
        {showMilestonePreview ? (
          <p className="truncate font-medium text-foreground text-sm">{selectedMilestone.title}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-0">
        {showMilestonePreview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <MarkdownEditField
              disabled={savingData}
              editTabLabel={t('milestoneDataEditTab')}
              embeddedHeight="fill"
              formatPreset="milestone-data"
              id={`campaign-milestone-data-preview-${selectedMilestone.id}`}
              key={selectedMilestone.id}
              manualSave={dataManualSave}
              onChange={setDataDraft}
              placeholder={t('milestoneDataPlaceholder')}
              previewEmptyLabel={t('milestoneDataPreviewEmpty')}
              previewTabLabel={t('milestoneDataPreviewTab')}
              textareaClassName="min-h-0 resize-y whitespace-pre-wrap"
              value={dataDraft}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {tWorkspace('previewNoMilestoneSelected')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
