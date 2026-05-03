'use client'

import { useTranslations } from 'next-intl'

import { useMediaQuery } from '@/hooks/use-media-query'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { useTimelineActions, useTimelineChat, useTimelineWorkspaceState } from '../timeline-context'
import { TimelineItem } from './timeline-item'
import type { TimelineBodyProps } from './types'

export function TimelineBody({ selectedId, onSelectMilestone }: TimelineBodyProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { milestoneState } = useTimelineWorkspaceState()
  const actions = useTimelineActions()
  const { isBusy: isChatBusy } = useTimelineChat()
  const { milestones } = milestoneState
  const showDelete = Boolean(actions.onDeleteMilestone)

  return (
    <TooltipProvider>
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div
            aria-label={t('timelineListLabel')}
            className="flex flex-col px-0 py-2 md:p-4 md:pr-3"
            role="listbox"
          >
            {milestones.map((milestone, index) => {
              const isLast = index === milestones.length - 1
              return (
                <TimelineItem
                  key={milestone.id}
                  isFirst={index === 0}
                  isLast={isLast}
                  isMobile={!isDesktop}
                  isSelected={milestone.id === selectedId}
                  milestone={milestone}
                  onSelect={onSelectMilestone}
                  positionIndex={index + 1}
                  showDelete={showDelete}
                  actions={actions}
                  isChatBusy={isChatBusy}
                  deletingMilestoneId={milestoneState.deletingMilestoneId}
                  movingMilestoneId={milestoneState.movingMilestoneId}
                  renamingMilestoneId={milestoneState.renamingMilestoneId}
                  savingPassCriteriaMilestoneId={milestoneState.savingPassCriteriaMilestoneId}
                  savingGoalMilestoneId={milestoneState.savingGoalMilestoneId}
                  savingDataMilestoneId={milestoneState.savingDataMilestoneId}
                  runningMilestoneId={milestoneState.runningMilestoneId}
                  runningStep={milestoneState.runningStep}
                />
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
