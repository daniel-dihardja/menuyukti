'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { useTimelineActions, useTimelineWorkspaceState } from '../timeline-context'
import { MilestoneCreateControls } from './milestone-preset-select'
import { TimelineItem } from './timeline-item'

export function TimelineBody() {
  const t = useTranslations('analytics.workflows.chat')
  const isDesktop = useDesktopLayout()
  const { milestoneState, onSelectMilestone } = useTimelineWorkspaceState()
  const { milestones, creating } = milestoneState
  const { onCreateMilestone, onCreateMilestoneFromPreset } = useTimelineActions()

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }
      if (target.closest('[data-milestone-card]')) {
        return
      }
      void onSelectMilestone(null)
    },
    [onSelectMilestone],
  )

  return (
    <TooltipProvider>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden" onClick={handleBackgroundClick}>
        <ScrollArea className="h-full min-h-0 min-w-0">
          <div
            aria-label={t('timelineListLabel')}
            className="flex min-h-full min-w-0 flex-col px-0 py-2 md:p-4"
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
                  milestone={milestone}
                />
              )
            })}
            <div className="flex justify-center pt-2 pb-4 md:pt-4">
              <MilestoneCreateControls
                creating={creating}
                disabled={creating}
                onCreateMilestone={onCreateMilestone}
                onCreateMilestoneFromPreset={onCreateMilestoneFromPreset}
              />
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
