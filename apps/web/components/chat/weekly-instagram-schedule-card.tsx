'use client'

import {
  Plan,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from '@workspace/ui/components/ai-elements/plan'
import {
  QueueItem,
  QueueItemContent,
  QueueItemDescription,
} from '@workspace/ui/components/ai-elements/queue'
import { Badge } from '@workspace/ui/components/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { ChevronDownIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useCompactLayout } from '@/hooks/use-desktop-layout'
import type {
  WeeklyInstagramScheduleDay,
  WeeklyInstagramScheduleInput,
} from '@/lib/chat/weekly-instagram-schedule'
import { cn } from '@workspace/ui/lib/utils'

export type WeeklyInstagramScheduleCardProps = {
  schedule: WeeklyInstagramScheduleInput
  isStreaming?: boolean
}

export function WeeklyInstagramScheduleCard({
  schedule,
  isStreaming = false,
}: WeeklyInstagramScheduleCardProps) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')

  return (
    <Plan className="w-full max-w-md" defaultOpen isStreaming={isStreaming}>
      <PlanHeader className="w-full">
        <div className="min-w-0 flex-1 pr-2">
          <PlanTitle>{schedule.title || t('titleFallback')}</PlanTitle>
          <PlanDescription>{schedule.summary}</PlanDescription>
        </div>
        <PlanTrigger />
      </PlanHeader>
      <PlanContent className="w-full pt-0">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {schedule.days.map((day, index) => (
            <WeeklyScheduleDayItem
              day={day}
              key={`${day.day}-${day.format}-${day.time}-${index}`}
            />
          ))}
        </ul>
      </PlanContent>
    </Plan>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-foreground/90 text-xs leading-snug">
      <span className="font-bold text-foreground">{label}: </span>
      {value}
    </p>
  )
}

function WeeklyScheduleDayFields({ day }: { day: WeeklyInstagramScheduleDay }) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')

  return (
    <div className="flex flex-col gap-1">
      <FieldRow label={t('timeLabel')} value={day.time} />
      <FieldRow label={t('menusLabel')} value={day.menu_items} />
      <FieldRow label={t('captionLabel')} value={day.caption_angle} />
      <FieldRow label={t('whyLabel')} value={day.why} />
    </div>
  )
}

function WeeklyScheduleDayItem({ day }: { day: WeeklyInstagramScheduleDay }) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const compact = useCompactLayout()
  const dayLabel = t(`weekdays.${day.day}`)
  const formatLabel = t(`formats.${day.format}`)

  if (!compact) {
    return (
      <QueueItem className="px-0 py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <QueueItemContent className="line-clamp-none text-foreground font-medium">
              {dayLabel}
            </QueueItemContent>
            <Badge className="shrink-0 font-normal" variant="secondary">
              {formatLabel}
            </Badge>
          </div>
          <QueueItemDescription className="ml-0 mt-1">
            <WeeklyScheduleDayFields day={day} />
          </QueueItemDescription>
        </div>
      </QueueItem>
    )
  }

  return (
    <QueueItem className="px-0 py-1">
      <Collapsible className="min-w-0 w-full" defaultOpen={false}>
        <CollapsibleTrigger
          className={cn(
            'flex w-full touch-manipulation items-center gap-2 rounded-md py-2 text-left',
            'hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180',
          )}
        >
          <QueueItemContent className="line-clamp-none min-w-0 flex-1 text-foreground font-medium">
            {dayLabel}
          </QueueItemContent>
          <Badge className="shrink-0 font-normal" variant="secondary">
            {formatLabel}
          </Badge>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform" />
          <span className="sr-only">{t('expandDayAria', { day: dayLabel })}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <QueueItemDescription className="ml-0 mt-0 pb-2">
            <WeeklyScheduleDayFields day={day} />
          </QueueItemDescription>
        </CollapsibleContent>
      </Collapsible>
    </QueueItem>
  )
}
