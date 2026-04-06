'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Maximize2, Settings } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { cn } from '@workspace/ui/lib/utils'

export type TimelineMilestone = {
  id: string
  title: string
  description: string
}

type TimelineToolbarProps = {
  title: string
  count: number
  expandLabel: string
  settingsLabel: string
}

function TimelineToolbar({ title, count, expandLabel, settingsLabel }: TimelineToolbarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate font-semibold text-foreground text-sm">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-label={expandLabel}
          className="size-9"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Maximize2 data-icon="inline-start" />
        </Button>
        <Button
          aria-label={settingsLabel}
          className="size-9"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Settings data-icon="inline-start" />
        </Button>
      </div>
    </header>
  )
}

type TimelineItemProps = {
  milestone: TimelineMilestone
  isLast: boolean
}

function TimelineItem({ milestone, isLast }: TimelineItemProps) {
  return (
    <div className="flex gap-4">
      <div className="flex w-10 shrink-0 flex-col items-center">
        <div
          aria-hidden
          className="size-3 shrink-0 rounded-full border-2 border-primary bg-primary"
        />
        {isLast ? null : (
          <div className="min-h-0 w-px flex-1 border-l border-dashed border-border" />
        )}
      </div>
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-8')}>
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="gap-1.5">
            <CardTitle className="text-base">{milestone.title}</CardTitle>
            <CardDescription className="whitespace-pre-wrap">{milestone.description}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

type TimelineBodyProps = {
  milestones: TimelineMilestone[]
}

function TimelineBody({ milestones }: TimelineBodyProps) {
  return (
    <div className="min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div className="flex flex-col p-4 pr-3">
          {milestones.map((milestone, index) => (
            <TimelineItem
              key={milestone.id}
              isLast={index === milestones.length - 1}
              milestone={milestone}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export type TimelineWorkspaceProps = {
  milestones?: TimelineMilestone[]
}

export function TimelineWorkspace({ milestones: milestonesProp }: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.chat')

  const milestones = useMemo<TimelineMilestone[]>(() => {
    if (milestonesProp?.length) {
      return milestonesProp
    }
    return [
      {
        id: '1',
        title: t('milestone1Title'),
        description: [t('milestone1Detail'), t('milestone1Body1'), t('milestone1Body2')].join(
          '\n\n',
        ),
      },
      {
        id: '2',
        title: t('milestone2Title'),
        description: [t('milestone2Detail'), t('milestone2Body1'), t('milestone2Body2')].join(
          '\n\n',
        ),
      },
    ]
  }, [milestonesProp, t])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background">
      <TimelineToolbar
        count={milestones.length}
        expandLabel={t('timelineExpandLabel')}
        settingsLabel={t('timelineSettingsLabel')}
        title={t('timelineToolbarTitle')}
      />
      <TimelineBody milestones={milestones} />
    </div>
  )
}
