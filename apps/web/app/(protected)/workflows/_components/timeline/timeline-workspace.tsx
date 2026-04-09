'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

import { PanelFullscreenProvider } from '@/components/panel-fullscreen-context'

import { useTimelineContext } from '../timeline-context'
import { TimelineBody } from './timeline-body'
import { TimelineInlineErrors } from './timeline-inline-errors'
import { ImportWorkflowDialog } from './import-workflow-dialog'
import { TimelineToolbar } from './timeline-toolbar'
import type { TimelineWorkspaceProps } from './types'

export function TimelineWorkspace({
  isLoading = false,
  loadError = null,
  timelineTrailing = null,
}: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const {
    workflowId,
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
  const searchParams = useSearchParams()

  const milestonesRef = useRef(milestones)
  const selectedIdRef = useRef(selectedId)
  milestonesRef.current = milestones
  selectedIdRef.current = selectedId

  useEffect(() => {
    if (milestones.length === 0) {
      void setSelectedId(null)
      return
    }
    if (selectedId !== null && milestones.some((m) => m.id === selectedId)) {
      return
    }
    /** Defer default so nuqs can hydrate `?milestone=` from the URL before we fall back to the first card. */
    const frame = requestAnimationFrame(() => {
      const m = milestonesRef.current
      const s = selectedIdRef.current
      if (m.length === 0) {
        return
      }
      if (s !== null && m.some((x) => x.id === s)) {
        return
      }
      const fromUrl = searchParams.get('milestone')
      if (fromUrl !== null && fromUrl !== '' && m.some((x) => x.id === fromUrl)) {
        return
      }
      void setSelectedId(m[0]?.id ?? null)
    })
    return () => cancelAnimationFrame(frame)
  }, [milestones, searchParams, selectedId, setSelectedId])

  const showReady = !isLoading && !loadError
  const showTimeline = showReady && milestones.length > 0

  return (
    <PanelFullscreenProvider className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <ImportWorkflowDialog
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
        workflowId={workflowId}
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
        trailingSlot={timelineTrailing}
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
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      aria-busy={creating}
                      aria-label={creating ? t('creatingMilestone') : t('createMilestone')}
                      disabled={creating}
                      onClick={() => void onCreateMilestone()}
                      size="icon"
                      type="button"
                      variant="default"
                    >
                      {creating ? <Spinner /> : <Plus aria-hidden />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{creating ? t('creatingMilestone') : t('createMilestone')}</p>
                </TooltipContent>
              </Tooltip>
              {timelineTrailing}
            </div>
          </TooltipProvider>
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
    </PanelFullscreenProvider>
  )
}
