'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, ChevronDown, Circle, Clock, Maximize2, Settings } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { cn } from '@workspace/ui/lib/utils'

export type TimelineMilestoneStatus = 'complete' | 'pending' | 'empty'

export type TimelineMilestone = {
  id: string
  title: string
  description: string
  /** Defaults to `empty` when omitted. */
  status?: TimelineMilestoneStatus
}

type MilestoneStatusLabels = {
  complete: string
  pending: string
  empty: string
}

function MilestoneStatusIcon({
  status,
  labels,
}: {
  status: TimelineMilestoneStatus
  labels: MilestoneStatusLabels
}) {
  const label =
    status === 'complete' ? labels.complete : status === 'pending' ? labels.pending : labels.empty

  if (status === 'complete') {
    return (
      <span aria-label={label} className="mt-0.5 shrink-0 text-primary" role="img">
        <CheckCircle2 aria-hidden className="size-5" />
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span aria-label={label} className="mt-0.5 shrink-0 text-muted-foreground" role="img">
        <Clock aria-hidden className="size-5" />
      </span>
    )
  }

  return (
    <span aria-label={label} className="mt-0.5 shrink-0 text-muted-foreground/80" role="img">
      <Circle aria-hidden className="size-5" />
    </span>
  )
}

function TimelineRailDot({ status }: { status: TimelineMilestoneStatus }) {
  return (
    <div
      aria-hidden
      className={cn(
        'size-3 shrink-0 rounded-full border-2',
        status === 'complete' && 'border-primary bg-primary',
        status === 'pending' && 'border-primary bg-background',
        status === 'empty' && 'border-muted-foreground/40 bg-muted',
      )}
    />
  )
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
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
}

function TimelineItem({
  milestone,
  isLast,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
}: TimelineItemProps) {
  const [open, setOpen] = useState(true)
  const status: TimelineMilestoneStatus = milestone.status ?? 'empty'

  return (
    <div className="flex gap-4">
      <div className="flex w-10 shrink-0 flex-col items-center">
        {/* Match card py-4 + status icon row (h-5 + mt-0.5) so the rail dot aligns with MilestoneStatusIcon */}
        <div className="flex w-full shrink-0 flex-col items-center pt-4">
          <div className="mt-0.5 flex h-5 w-full items-center justify-center">
            <TimelineRailDot status={status} />
          </div>
        </div>
        {isLast ? null : (
          <div className="min-h-0 w-px flex-1 border-l border-dashed border-border" />
        )}
      </div>
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-8')}>
        <Collapsible onOpenChange={setOpen} open={open}>
          <Card className="gap-0 py-4 shadow-none">
            <CardHeader className="gap-1.5">
              <CardTitle className="flex items-start gap-2 text-base">
                <MilestoneStatusIcon labels={statusLabels} status={status} />
                <span className="min-w-0 flex-1 leading-snug">{milestone.title}</span>
              </CardTitle>
              <CardAction>
                <CollapsibleTrigger asChild>
                  <Button
                    aria-expanded={open}
                    aria-label={open ? collapseDetailsLabel : expandDetailsLabel}
                    className="size-9 shrink-0"
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronDown
                      className={cn(
                        'transition-transform duration-200',
                        open ? 'rotate-180' : 'rotate-0',
                      )}
                      data-icon="inline-start"
                    />
                  </Button>
                </CollapsibleTrigger>
              </CardAction>
              <CollapsibleContent className="col-span-2 min-w-0">
                <CardDescription className="whitespace-pre-wrap pt-0">
                  {milestone.description}
                </CardDescription>
              </CollapsibleContent>
            </CardHeader>
          </Card>
        </Collapsible>
      </div>
    </div>
  )
}

type TimelineBodyProps = {
  milestones: TimelineMilestone[]
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
}

function TimelineBody({
  milestones,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
}: TimelineBodyProps) {
  return (
    <div className="min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div className="flex flex-col p-4 pr-3">
          {milestones.map((milestone, index) => (
            <TimelineItem
              key={milestone.id}
              collapseDetailsLabel={collapseDetailsLabel}
              expandDetailsLabel={expandDetailsLabel}
              isLast={index === milestones.length - 1}
              milestone={milestone}
              statusLabels={statusLabels}
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
        status: 'complete' satisfies TimelineMilestoneStatus,
      },
      {
        id: '2',
        title: t('milestone2Title'),
        description: [t('milestone2Detail'), t('milestone2Body1'), t('milestone2Body2')].join(
          '\n\n',
        ),
        status: 'pending' satisfies TimelineMilestoneStatus,
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
      <TimelineBody
        collapseDetailsLabel={t('milestoneCollapseDetails')}
        expandDetailsLabel={t('milestoneExpandDetails')}
        milestones={milestones}
        statusLabels={{
          complete: t('milestoneStatusComplete'),
          empty: t('milestoneStatusEmpty'),
          pending: t('milestoneStatusPending'),
        }}
      />
    </div>
  )
}
