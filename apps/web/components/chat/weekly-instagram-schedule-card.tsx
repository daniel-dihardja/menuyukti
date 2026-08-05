'use client'

import { useState } from 'react'
import {
  Plan,
  PlanContent,
  PlanDescription,
  PlanFooter,
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
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Spinner } from '@workspace/ui/components/spinner'
import { CalendarPlusIcon, ChevronDownIcon, ShareIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { WeeklyInstagramScheduleExportDialog } from '@/components/chat/weekly-instagram-schedule-export-dialog'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import type {
  WeeklyInstagramScheduleDay,
  WeeklyInstagramScheduleInput,
} from '@/lib/chat/weekly-instagram-schedule'
import {
  formatWeeklyInstagramScheduleShareText,
  ShareCancelledError,
  shareOrCopyText,
} from '@/lib/chat/weekly-instagram-schedule-share'
import { cn } from '@workspace/ui/lib/utils'

export type WeeklyInstagramScheduleCardProps = {
  schedule: WeeklyInstagramScheduleInput
  isStreaming?: boolean
}

const ACTION_BUTTON_CLASS =
  'h-11 min-w-0 flex-1 touch-manipulation justify-center gap-2 px-3 text-sm sm:h-9 sm:flex-initial sm:px-3'

export function WeeklyInstagramScheduleCard({
  schedule,
  isStreaming = false,
}: WeeklyInstagramScheduleCardProps) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const compact = useCompactLayout()
  const [exportOpen, setExportOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    if (sharing) return
    setSharing(true)
    try {
      const text = formatWeeklyInstagramScheduleShareText(schedule, {
        weekdays: {
          monday: t('weekdays.monday'),
          tuesday: t('weekdays.tuesday'),
          wednesday: t('weekdays.wednesday'),
          thursday: t('weekdays.thursday'),
          friday: t('weekdays.friday'),
          saturday: t('weekdays.saturday'),
          sunday: t('weekdays.sunday'),
        },
        formats: {
          story: t('formats.story'),
          post: t('formats.post'),
          carousel: t('formats.carousel'),
          reel: t('formats.reel'),
        },
        captionLabel: t('captionLabel'),
        whyLabel: t('whyLabel'),
      })
      const result = await shareOrCopyText(text)
      toast.success(result === 'shared' ? t('shareShared') : t('shareCopied'))
    } catch (error) {
      if (error instanceof ShareCancelledError) return
      toast.error(t('shareError'))
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <Plan className="w-full max-w-md" defaultOpen isStreaming={isStreaming}>
        <PlanHeader className="w-full">
          <div className="min-w-0 flex-1 pr-2">
            <PlanTitle className="text-base leading-snug sm:text-base">
              {schedule.title || t('titleFallback')}
            </PlanTitle>
            <PlanDescription className="mt-1 text-sm leading-relaxed sm:text-sm">
              {schedule.summary}
            </PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent className="w-full pt-0">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 sm:gap-1">
            {schedule.days.map((day, index) => (
              <WeeklyScheduleDayItem
                day={day}
                key={`${day.day}-${day.format}-${day.time}-${index}`}
              />
            ))}
          </ul>
        </PlanContent>
        {!isStreaming ? (
          <PlanFooter className="w-full flex-col items-stretch gap-0 border-t border-border/60 px-6 py-3">
            <div role="group" aria-label={t('actionsGroupAria')} className="flex w-full gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                className={ACTION_BUTTON_CLASS}
                disabled={sharing}
                aria-busy={sharing || undefined}
                aria-label={sharing ? t('shareBusy') : t('shareButton')}
                onClick={() => {
                  void handleShare()
                }}
              >
                {sharing ? (
                  <Spinner className="size-4" />
                ) : (
                  <ShareIcon className="size-4 shrink-0" />
                )}
                <span className="truncate">{sharing ? t('shareBusy') : t('shareButton')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASS}
                aria-label={t('exportButton')}
                onClick={() => setExportOpen(true)}
              >
                <CalendarPlusIcon className="size-4 shrink-0" />
                <span className="truncate">
                  {compact ? t('exportButtonShort') : t('exportButton')}
                </span>
              </Button>
            </div>
          </PlanFooter>
        ) : null}
      </Plan>
      <WeeklyInstagramScheduleExportDialog
        schedule={schedule}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-foreground/90 text-sm leading-relaxed">
      <span className="font-semibold text-foreground">{label}: </span>
      {value}
    </p>
  )
}

function WeeklyScheduleDayFields({ day }: { day: WeeklyInstagramScheduleDay }) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')

  return (
    <div className="flex flex-col gap-1.5">
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
      <QueueItem className="px-0 py-2.5 text-base">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <QueueItemContent className="line-clamp-none text-base font-medium text-foreground">
              {dayLabel}
            </QueueItemContent>
            <Badge
              className="shrink-0 px-2 py-0.5 text-xs font-medium sm:text-xs"
              variant="secondary"
            >
              {formatLabel}
            </Badge>
          </div>
          <QueueItemDescription className="ml-0 mt-1.5 text-sm text-foreground/90">
            <WeeklyScheduleDayFields day={day} />
          </QueueItemDescription>
        </div>
      </QueueItem>
    )
  }

  return (
    <QueueItem className="px-0 py-1 text-base">
      <Collapsible className="min-w-0 w-full" defaultOpen={false}>
        <CollapsibleTrigger
          className={cn(
            'flex w-full touch-manipulation items-center gap-2 rounded-md py-2.5 text-left',
            'hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180',
          )}
        >
          <QueueItemContent className="line-clamp-none min-w-0 flex-1 text-base font-medium text-foreground">
            {dayLabel}
          </QueueItemContent>
          <Badge className="shrink-0 px-2 py-0.5 text-xs font-medium" variant="secondary">
            {formatLabel}
          </Badge>
          <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform" />
          <span className="sr-only">{t('expandDayAria', { day: dayLabel })}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <QueueItemDescription className="ml-0 mt-0 pb-2.5 text-sm text-foreground/90">
            <WeeklyScheduleDayFields day={day} />
          </QueueItemDescription>
        </CollapsibleContent>
      </Collapsible>
    </QueueItem>
  )
}
