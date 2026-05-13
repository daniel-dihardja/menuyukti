import type { TimelineActions } from './timeline-context'
import type { WorkflowTimelineOpsHandles } from './use-workflow-timeline-provider-value'

export function toTimelineActions(ops: WorkflowTimelineOpsHandles): TimelineActions {
  return {
    onCreateMilestone: ops.handleCreateMilestone,
    onCreateMilestoneFromPreset: ops.handleCreateMilestoneFromPreset,
    onDeleteMilestone: ops.handleDeleteMilestone,
    onMoveMilestone: ops.handleMoveMilestone,
    onUpdatePassCriteria: ops.handleUpdatePassCriteria,
    onUpdateMilestoneGoal: ops.handleUpdateMilestoneGoal,
    onUpdateMilestoneData: ops.handleUpdateMilestoneData,
    onUpdateMilestoneInput: ops.handleUpdateMilestoneInput,
    onHydrateMilestoneData: ops.handleHydrateMilestoneData,
    onRunMilestone: ops.handleRunMilestone,
    onExport: ops.handleExportWorkflow,
  }
}
