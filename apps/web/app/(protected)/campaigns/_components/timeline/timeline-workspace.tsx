'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'

import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'

import { TimelineBody } from './timeline-body'
import { TimelineInlineErrors } from './timeline-inline-errors'
import { TimelineToolbar } from './timeline-toolbar'
import type { TimelineWorkspaceProps } from './types'

export function TimelineWorkspace({
  milestones,
  isLoading = false,
  loadError = null,
  createError = null,
  deleteError = null,
  moveError = null,
  renameError = null,
  passCriteriaError = null,
  goalError = null,
  milestoneDataError = null,
  creating = false,
  deletingMilestoneId = null,
  movingMilestoneId = null,
  renamingMilestoneId = null,
  savingPassCriteriaMilestoneId = null,
  savingGoalMilestoneId = null,
  savingDataMilestoneId = null,
  onCreateMilestone,
  onDeleteMilestone,
  onRenameMilestone,
  onMoveMilestone,
  onUpdatePassCriteria,
  onUpdateMilestoneGoal,
  onUpdateMilestoneData,
  onSetMilestoneDataTask,
  onPrepareMilestone,
  preparingMilestoneId = null,
  milestonePrepareError = null,
  onRunMilestone,
  isChatBusy = false,
  runningMilestoneId = null,
  runningStep = null,
  milestoneRunError = null,
}: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.chat')

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

  const showTimeline = !isLoading && !loadError && milestones.length > 0

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background">
      <TimelineToolbar
        count={milestones.length}
        createLabel={t('createMilestone')}
        creating={creating}
        creatingLabel={t('creatingMilestone')}
        expandLabel={t('timelineExpandLabel')}
        onCreateMilestone={onCreateMilestone}
        settingsLabel={t('timelineSettingsLabel')}
        showCreate={showTimeline}
        title={t('timelineToolbarTitle')}
      />
      <TimelineInlineErrors
        createError={createError}
        deleteError={deleteError}
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
          deletingMilestoneId={deletingMilestoneId}
          expandDetailsLabel={t('milestoneExpandDetails')}
          isChatBusy={isChatBusy}
          listLabel={t('timelineListLabel')}
          milestones={milestones}
          movingMilestoneId={movingMilestoneId ?? null}
          onDeleteMilestone={onDeleteMilestone}
          onMoveMilestone={onMoveMilestone}
          onRenameMilestone={onRenameMilestone}
          onRunMilestone={onRunMilestone}
          onSelectMilestone={setSelectedId}
          onPrepareMilestone={onPrepareMilestone}
          onSetMilestoneDataTask={onSetMilestoneDataTask}
          onUpdateMilestoneData={onUpdateMilestoneData}
          onUpdateMilestoneGoal={onUpdateMilestoneGoal}
          onUpdatePassCriteria={onUpdatePassCriteria}
          preparingMilestoneId={preparingMilestoneId}
          renamingMilestoneId={renamingMilestoneId}
          runningMilestoneId={runningMilestoneId}
          runningStep={runningStep}
          savingDataMilestoneId={savingDataMilestoneId}
          savingGoalMilestoneId={savingGoalMilestoneId}
          savingPassCriteriaMilestoneId={savingPassCriteriaMilestoneId}
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
