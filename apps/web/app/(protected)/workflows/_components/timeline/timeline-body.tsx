'use client'

import { useTranslations } from 'next-intl'

import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { useTimelineContext } from '../timeline-context'
import { TimelineItem } from './timeline-item'
import type { TimelineBodyProps } from './types'

export function TimelineBody({ selectedId, onSelectMilestone }: TimelineBodyProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const { milestoneState, actions } = useTimelineContext()
  const { milestones } = milestoneState
  const showDelete = Boolean(actions.onDeleteMilestone)

  return (
    <TooltipProvider>
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div
            aria-label={t('timelineListLabel')}
            className="flex flex-col p-4 pr-3"
            role="listbox"
          >
            {milestones.map((milestone, index) => {
              const isLast = index === milestones.length - 1
              return (
                <TimelineItem
                  key={milestone.id}
                  isFirst={index === 0}
                  isLast={isLast}
                  isSelected={milestone.id === selectedId}
                  milestone={milestone}
                  onSelect={onSelectMilestone}
                  positionIndex={index + 1}
                  showDelete={showDelete}
                />
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
