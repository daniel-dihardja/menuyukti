'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { PanelFullscreenProvider } from '@/components/panel-fullscreen-context'

import {
  useTimelineActions,
  useTimelineWorkspaceState,
  type TimelineErrors,
} from '../timeline-context'
import { TimelineInlineErrors, type TimelineErrorMap } from './timeline-inline-errors'
import { ImportWorkflowDialog } from './import-workflow-dialog'
import { MilestoneCreateControls } from './milestone-preset-select'
import {
  TimelineToolbar,
  TimelineToolbarExportButton,
  TimelineToolbarImportButton,
} from './timeline-toolbar'
import type { TimelineWorkspaceProps } from './types'
import {
  TimelineWorkspaceEmpty,
  TimelineWorkspaceLoadError,
  TimelineWorkspaceLoading,
  TimelineWorkspaceMilestoneList,
} from './timeline-workspace-views'

function toErrorMap(errors: TimelineErrors): TimelineErrorMap {
  return {
    create: errors.createError,
    delete: errors.deleteError,
    move: errors.moveError,
    passCriteria: errors.passCriteriaError,
    goal: errors.goalError,
    milestoneData: errors.milestoneDataError,
    milestoneRun: errors.milestoneRunError,
    milestoneSettings: errors.milestoneSettingsError,
    export: errors.exportError,
    milestoneRunCriteriaHint: errors.milestoneRunCriteriaHint,
  }
}

export function TimelineWorkspace({
  isLoading = false,
  loadError = null,
  timelineTrailing = null,
}: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.workflows.chat')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const { workflowId, milestoneState, errors, selectedMilestoneId, onSelectMilestone } =
    useTimelineWorkspaceState()
  const { milestones, creating, exporting } = milestoneState
  const { onCreateMilestone, onCreateMilestoneFromPreset, onExport } = useTimelineActions()

  const showReady = !isLoading && !loadError
  const showTimeline = showReady && milestones.length > 0

  const toolbarActions = (
    <>
      {showReady ? (
        <TimelineToolbarImportButton
          creating={creating}
          exporting={exporting}
          importLabel={t('importMilestones')}
          onImport={() => setImportDialogOpen(true)}
        />
      ) : null}
      {showTimeline ? (
        <>
          <TimelineToolbarExportButton
            creating={creating}
            exportLabel={t('exportMilestones')}
            exporting={exporting}
            exportingLabel={t('exportingMilestones')}
            onExport={onExport}
          />
          <MilestoneCreateControls
            creating={creating}
            disabled={creating || exporting}
            onCreateMilestone={onCreateMilestone}
            onCreateMilestoneFromPreset={onCreateMilestoneFromPreset}
          />
        </>
      ) : null}
    </>
  )

  return (
    <PanelFullscreenProvider className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <ImportWorkflowDialog
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
        workflowId={workflowId}
      />
      <TimelineToolbar
        actions={toolbarActions}
        count={milestones.length}
        title={t('timelineToolbarTitle')}
        trailingSlot={timelineTrailing}
      />
      <TimelineInlineErrors errors={toErrorMap(errors)} show={showTimeline} />
      {isLoading ? (
        <TimelineWorkspaceLoading />
      ) : loadError ? (
        <TimelineWorkspaceLoadError message={loadError} />
      ) : milestones.length === 0 ? (
        <TimelineWorkspaceEmpty
          createError={errors.createError}
          creating={creating}
          exporting={exporting}
          onCreateMilestone={onCreateMilestone}
          onCreateMilestoneFromPreset={onCreateMilestoneFromPreset}
          timelineTrailing={timelineTrailing}
        />
      ) : (
        <TimelineWorkspaceMilestoneList
          onSelectMilestone={onSelectMilestone}
          selectedMilestoneId={selectedMilestoneId}
        />
      )}
    </PanelFullscreenProvider>
  )
}
