'use client'

import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { useTimelineContext } from '../timeline-context'
import { TimelineItem } from './timeline-item'
import type { TimelineBodyLabelsProps } from './types'

export function TimelineBody({
  selectedId,
  onSelectMilestone,
  listLabel,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  deleteMilestoneConfirmTitle,
  deleteMilestoneConfirmDescription,
  deleteMilestoneConfirmCancel,
  deleteMilestoneConfirmAction,
}: TimelineBodyLabelsProps) {
  const { milestones, onDeleteMilestone } = useTimelineContext()

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
                  deleteMilestoneConfirmAction={deleteMilestoneConfirmAction}
                  deleteMilestoneConfirmCancel={deleteMilestoneConfirmCancel}
                  deleteMilestoneConfirmDescription={deleteMilestoneConfirmDescription}
                  deleteMilestoneConfirmTitle={deleteMilestoneConfirmTitle}
                  expandDetailsLabel={expandDetailsLabel}
                  isFirst={index === 0}
                  isLast={isLast}
                  isSelected={milestone.id === selectedId}
                  milestone={milestone}
                  onSelect={onSelectMilestone}
                  positionIndex={index + 1}
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
