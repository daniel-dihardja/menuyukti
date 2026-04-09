'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'

import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'

import { useTimelineContext } from '../timeline-context'
import { TimelineBody } from './timeline-body'
import { TimelineInlineErrors } from './timeline-inline-errors'
import { ImportCampaignDialog } from './import-campaign-dialog'
import { TimelineToolbar } from './timeline-toolbar'
import type { TimelineWorkspaceProps } from './types'

export function TimelineWorkspace({ isLoading = false, loadError = null }: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const {
    campaignId,
    milestones,
    creating,
    createError,
    deleteError,
    moveError,
    renameError,
    passCriteriaError,
    goalError,
    milestoneDataError,
    milestonePrepareError,
    milestoneRunError,
    exporting,
    exportError,
    onCreateMilestone,
    onExport,
  } = useTimelineContext()

  const [selectedId, setSelectedId] = useQueryState('milestone', parseAsString)

  useEffect(() => {
    if (milestones.length === 0) {
      void setSelectedId(null)
      return
    }
    if (selectedId !== null && milestones.some((m) => m.id === selectedId)) {
      return
    }
    void setSelectedId(milestones[0]?.id ?? null)
  }, [milestones, selectedId, setSelectedId])

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      const node = e.target
      if (!(node instanceof Element)) {
        return
      }
      if (node.closest('[data-timeline-card]')) {
        return
      }
      void setSelectedId(null)
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [setSelectedId])

  const showReady = !isLoading && !loadError
  const showTimeline = showReady && milestones.length > 0

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <ImportCampaignDialog
        campaignId={campaignId}
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
      />
      <TimelineToolbar
        count={milestones.length}
        createLabel={t('createMilestone')}
        creating={creating}
        creatingLabel={t('creatingMilestone')}
        exportLabel={t('exportMilestones')}
        exporting={exporting}
        exportingLabel={t('exportingMilestones')}
        importLabel={t('importMilestones')}
        onCreateMilestone={onCreateMilestone}
        onExport={onExport}
        onImport={() => setImportDialogOpen(true)}
        showCreate={showTimeline}
        showExport={showTimeline}
        showImport={showReady}
        title={t('timelineToolbarTitle')}
      />
      <TimelineInlineErrors
        createError={createError}
        deleteError={deleteError}
        exportError={exportError}
        goalError={goalError}
        milestoneDataError={milestoneDataError}
        milestonePrepareError={milestonePrepareError}
        milestoneRunError={milestoneRunError}
        moveError={moveError}
        passCriteriaError={passCriteriaError}
        renameError={renameError}
        show={showTimeline}
      />
      {isLoading ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8"
        >
          <Skeleton className="h-8 w-full max-w-lg" />
          <Skeleton className="h-28 w-full max-w-lg" />
          <Skeleton className="h-28 w-full max-w-lg" />
        </div>
      ) : loadError ? (
        <p
          className="flex flex-1 items-center justify-center p-8 text-center text-destructive text-sm"
          role="alert"
        >
          {loadError}
        </p>
      ) : milestones.length === 0 ? (
        <div
          aria-labelledby="timeline-empty-heading"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
          role="region"
        >
          <div className="flex max-w-md flex-col gap-2">
            <h3 className="font-medium text-foreground text-lg" id="timeline-empty-heading">
              {t('timelineEmptyTitle')}
            </h3>
            <p className="text-muted-foreground text-sm">{t('timelineEmptyDescription')}</p>
          </div>
          <Button
            disabled={creating}
            onClick={() => void onCreateMilestone()}
            size="default"
            type="button"
          >
            {creating ? (
              <>
                <Spinner data-icon="inline-start" />
                {t('creatingMilestone')}
              </>
            ) : (
              t('createMilestone')
            )}
          </Button>
          {createError ? (
            <p className="max-w-md text-destructive text-sm" role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      ) : (
        <TimelineBody
          collapseDetailsLabel={t('milestoneCollapseDetails')}
          deleteButtonLabel={t('deleteMilestone')}
          deleteMilestoneAriaLabel={t('deleteMilestoneAriaLabel')}
          deleteMilestoneConfirmAction={t('deleteMilestoneConfirmAction')}
          deleteMilestoneConfirmCancel={t('deleteMilestoneConfirmCancel')}
          deleteMilestoneConfirmDescription={t('deleteMilestoneConfirmDescription')}
          deleteMilestoneConfirmTitle={t('deleteMilestoneConfirmTitle')}
          expandDetailsLabel={t('milestoneExpandDetails')}
          listLabel={t('timelineListLabel')}
          onSelectMilestone={setSelectedId}
          selectedId={selectedId}
          statusLabels={{
            complete: t('milestoneStatusComplete'),
            empty: t('milestoneStatusEmpty'),
            failed: t('milestoneStatusFailed'),
            pending: t('milestoneStatusPending'),
          }}
        />
      )}
    </div>
  )
}
