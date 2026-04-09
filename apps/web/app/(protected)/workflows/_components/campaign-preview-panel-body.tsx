'use client'

import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useState } from 'react'

import { FieldSaveStatus } from '@/components/field-save-status'
import { MarkdownEditField } from '@/components/markdown-edit-field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { useTimelineContext } from './timeline-context'

const PREVIEW_TITLE_ID = 'campaign-preview-panel-title'

export function CampaignPreviewPanelBody() {
  const t = useTranslations('analytics.campaigns.chat')
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const { milestones, onUpdateMilestoneData, savingDataMilestoneId } = useTimelineContext()
  const [selectedId] = useQueryState('milestone', parseAsString)

  const selectedMilestone =
    selectedId !== null ? milestones.find((m) => m.id === selectedId) : undefined
  const showMilestonePreview = selectedMilestone !== undefined
  const savingData = showMilestonePreview && savingDataMilestoneId === selectedMilestone.id

  const [dataDraft, setDataDraft] = useState('')

  const selectedMilestoneId = selectedMilestone?.id
  const selectedMilestoneData = selectedMilestone?.data
  useEffect(() => {
    if (selectedMilestoneId == null) {
      setDataDraft('')
      return
    }
    setDataDraft(selectedMilestoneData ?? '')
  }, [selectedMilestoneId, selectedMilestoneData])

  const handleDataBlur = useCallback(() => {
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

  const saveStatusMessages = {
    saving: t('fieldSaveStatusSaving'),
    saved: t('fieldSaveStatusSaved'),
    unsaved: t('fieldSaveStatusUnsaved'),
  }
  const dataSaveStatus = savingData
    ? 'saving'
    : selectedMilestone && dataDraft !== (selectedMilestone.data ?? '')
      ? 'unsaved'
      : 'saved'

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
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <MarkdownEditField
                disabled={savingData}
                editTabLabel={t('milestoneDataEditTab')}
                embeddedHeight="fill"
                formatPreset="milestone-data"
                id="campaign-milestone-data-preview"
                onBlur={handleDataBlur}
                onChange={setDataDraft}
                placeholder={t('milestoneDataPlaceholder')}
                previewEmptyLabel={t('milestoneDataPreviewEmpty')}
                previewTabLabel={t('milestoneDataPreviewTab')}
                textareaClassName="min-h-0 resize-y whitespace-pre-wrap"
                value={dataDraft}
              />
            </div>
            <div className="flex shrink-0 justify-end">
              <FieldSaveStatus
                className="inline-flex"
                messages={saveStatusMessages}
                status={dataSaveStatus}
              />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            {tWorkspace('previewNoMilestoneSelected')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
