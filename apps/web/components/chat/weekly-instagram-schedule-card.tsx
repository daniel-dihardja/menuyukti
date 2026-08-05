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
  QueueItemIndicator,
} from '@workspace/ui/components/ai-elements/queue'
import { Badge } from '@workspace/ui/components/badge'
import { useTranslations } from 'next-intl'

import type {
  WeeklyInstagramScheduleDay,
  WeeklyInstagramScheduleInput,
} from '@/lib/chat/weekly-instagram-schedule'

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
    <Plan
      // MessageContent is `w-fit`; pin a stable width so collapse only changes height.
      className="w-[min(100%,28rem)] shrink-0"
      defaultOpen
      isStreaming={isStreaming}
    >
      <PlanHeader className="w-full">
        <div className="min-w-0 flex-1 pr-2">
          <PlanTitle>{schedule.title || t('titleFallback')}</PlanTitle>
          <PlanDescription>{schedule.summary}</PlanDescription>
        </div>
        <PlanTrigger />
      </PlanHeader>
      <PlanContent className="w-full pt-0">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {schedule.days.map((day) => (
            <WeeklyScheduleDayItem day={day} key={`${day.day}-${day.format}`} />
          ))}
        </ul>
      </PlanContent>
    </Plan>
  )
}

function WeeklyScheduleDayItem({ day }: { day: WeeklyInstagramScheduleDay }) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const dayLabel = t(`weekdays.${day.day}`)
  const formatLabel = t(`formats.${day.format}`)

  return (
    <QueueItem className="px-0 py-2">
      <div className="flex gap-2">
        <QueueItemIndicator className="mt-1.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <QueueItemContent className="line-clamp-none text-foreground font-medium">
              {dayLabel}
            </QueueItemContent>
            <Badge className="shrink-0 font-normal" variant="secondary">
              {formatLabel}
            </Badge>
          </div>
          <QueueItemDescription className="ml-0 mt-1 space-y-1">
            <p className="text-foreground/90 text-xs leading-snug">
              <span className="font-medium">{t('menusLabel')}: </span>
              {day.menu_items}
            </p>
            <p className="text-xs leading-snug">
              <span className="font-medium text-foreground/80">{t('captionLabel')}: </span>
              {day.caption_angle}
            </p>
            <p className="text-muted-foreground text-xs leading-snug">
              <span className="font-medium">{t('whyLabel')}: </span>
              {day.why}
            </p>
          </QueueItemDescription>
        </div>
      </div>
    </QueueItem>
  )
}
