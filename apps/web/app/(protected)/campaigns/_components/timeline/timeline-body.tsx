'use client'

import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { TimelineItem } from './timeline-item'
import type { MilestoneStatusLabels, PassCriteriaRow, TimelineMilestone } from './types'

export type TimelineBodyProps = {
  milestones: TimelineMilestone[]
  selectedId: string | null
  onSelectMilestone: (id: string) => void
  listLabel: string
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
  onDeleteMilestone?: (id: string) => void | Promise<void>
  deletingMilestoneId: string | null
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  renamingMilestoneId: string | null
  onUpdatePassCriteria?: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  savingPassCriteriaMilestoneId: string | null
  onUpdateMilestoneGoal?: (id: string, goal: string) => Promise<boolean>
  savingGoalMilestoneId: string | null
  onUpdateMilestoneData?: (id: string, milestoneData: string) => Promise<boolean>
  savingDataMilestoneId: string | null
  onMoveMilestone?: (id: string, direction: 'up' | 'down') => void | Promise<void>
  movingMilestoneId: string | null
  onRunMilestone?: (id: string) => void | Promise<void>
  isChatBusy?: boolean
  runningMilestoneId?: string | null
  runningStep?: string | null
}

export function TimelineBody({
  milestones,
  selectedId,
  onSelectMilestone,
  listLabel,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
  onDeleteMilestone,
  deletingMilestoneId,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  onRenameMilestone,
  renamingMilestoneId,
  onUpdatePassCriteria,
  savingPassCriteriaMilestoneId,
  onUpdateMilestoneGoal,
  savingGoalMilestoneId,
  onUpdateMilestoneData,
  savingDataMilestoneId,
  onMoveMilestone,
  movingMilestoneId,
  onRunMilestone,
  isChatBusy = false,
  runningMilestoneId = null,
  runningStep = null,
}: TimelineBodyProps) {
  return (
    <TooltipProvider>
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div aria-label={listLabel} className="flex flex-col p-4 pr-3" role="listbox">
            {milestones.map((milestone, index) => {
              const isLast = index === milestones.length - 1
              const showDelete = Boolean(isLast && onDeleteMilestone)
              return (
                <TimelineItem
                  key={milestone.id}
                  collapseDetailsLabel={collapseDetailsLabel}
                  deleteButtonLabel={deleteButtonLabel}
                  deleteMilestoneAriaLabel={deleteMilestoneAriaLabel}
                  expandDetailsLabel={expandDetailsLabel}
                  isChatBusy={isChatBusy}
                  isDeleting={deletingMilestoneId === milestone.id}
                  isFirst={index === 0}
                  isLast={isLast}
                  isMoving={movingMilestoneId === milestone.id}
                  isSelected={milestone.id === selectedId}
                  milestone={milestone}
                  onDeleteMilestone={onDeleteMilestone}
                  onMoveMilestone={onMoveMilestone}
                  onRenameMilestone={onRenameMilestone}
                  onRunMilestone={onRunMilestone}
                  onSelect={onSelectMilestone}
                  onUpdateMilestoneData={onUpdateMilestoneData}
                  onUpdateMilestoneGoal={onUpdateMilestoneGoal}
                  onUpdatePassCriteria={onUpdatePassCriteria}
                  positionIndex={index + 1}
                  renamingMilestoneId={renamingMilestoneId}
                  runningMilestoneId={runningMilestoneId}
                  runningStep={runningStep}
                  savingDataMilestoneId={savingDataMilestoneId}
                  savingGoalMilestoneId={savingGoalMilestoneId}
                  savingPassCriteriaMilestoneId={savingPassCriteriaMilestoneId}
                  showDelete={showDelete}
                  statusLabels={statusLabels}
                />
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
