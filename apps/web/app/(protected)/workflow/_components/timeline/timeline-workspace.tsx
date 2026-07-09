'use client'

import { useTranslations } from 'next-intl'

import { PanelFullscreenProvider } from '@/components/panel-fullscreen-context'

import {
  useTimelineActions,
  useTimelineWorkspaceState,
  type TimelineErrors,
} from '../timeline-context'
import { TimelineInlineErrors, type TimelineErrorMap } from './timeline-inline-errors'
import { MilestoneCreateControls } from './milestone-preset-select'
import { TimelineCollapseProvider } from './timeline-collapse-context'
import { TimelineToolbar, TimelineToolbarCollapseAllButton } from './timeline-toolbar'
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
    runChatModel: errors.runChatModelError,
    milestoneRunCriteriaHint: errors.milestoneRunCriteriaHint,
  }
}

export function TimelineWorkspace({
  isLoading = false,
  loadError = null,
  timelineTrailing = null,
}: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.workflows.chat')
  const { milestoneState, errors } = useTimelineWorkspaceState()
  const { milestones, creating } = milestoneState
  const { onCreateMilestone, onCreateMilestoneFromPreset } = useTimelineActions()

  const showReady = !isLoading && !loadError
  const showTimeline = showReady && milestones.length > 0

  const toolbarActions = (
    <>
      {showTimeline ? <TimelineToolbarCollapseAllButton /> : null}
      <MilestoneCreateControls
        creating={creating}
        disabled={creating}
        onCreateMilestone={onCreateMilestone}
        onCreateMilestoneFromPreset={onCreateMilestoneFromPreset}
      />
    </>
  )

  return (
    <TimelineCollapseProvider>
      <PanelFullscreenProvider className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <TimelineToolbar
          actions={toolbarActions}
          count={milestones.length}
          title={t('timelineToolbarTitle')}
          trailingSlot={showTimeline ? timelineTrailing : null}
        />
        <TimelineInlineErrors errors={toErrorMap(errors)} show={showTimeline} />
        {isLoading ? (
          <TimelineWorkspaceLoading />
        ) : loadError ? (
          <TimelineWorkspaceLoadError message={loadError} />
        ) : milestones.length === 0 ? (
          <TimelineWorkspaceEmpty createError={errors.createError} />
        ) : (
          <TimelineWorkspaceMilestoneList />
        )}
      </PanelFullscreenProvider>
    </TimelineCollapseProvider>
  )
}
