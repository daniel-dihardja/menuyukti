'use client'

import { useTranslations } from 'next-intl'

import { useMediaQuery } from '@/hooks/use-media-query'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { useTimelineWorkspaceState } from '../timeline-context'
import { TimelineItem } from './timeline-item'

export function TimelineBody() {
  const t = useTranslations('analytics.workflows.chat')
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { milestoneState } = useTimelineWorkspaceState()
  const { milestones } = milestoneState

  return (
    <TooltipProvider>
      <div className="min-h-0 min-w-0 flex-1">
        <ScrollArea className="h-full min-h-0 min-w-0">
          <div
            aria-label={t('timelineListLabel')}
            className="flex min-w-0 flex-col px-0 py-2 md:p-4 md:pr-3"
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
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
