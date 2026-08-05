'use client'

import { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

import type { WeeklyInstagramScheduleInput } from '@/lib/chat/weekly-instagram-schedule'
import {
  buildWeeklyInstagramScheduleIcs,
  defaultWeekOfIso,
  downloadWeeklyInstagramScheduleIcs,
  getBrowserTimeZone,
  suggestedIcsFilename,
  type WeeklyInstagramScheduleIcsRecurrence,
} from '@/lib/chat/weekly-instagram-schedule-ics'
import { cn } from '@workspace/ui/lib/utils'

export type WeeklyInstagramScheduleExportDialogProps = {
  schedule: WeeklyInstagramScheduleInput
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WeeklyInstagramScheduleExportDialog({
  schedule,
  open,
  onOpenChange,
}: WeeklyInstagramScheduleExportDialogProps) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const weekFieldId = useId()
  const weekHintId = useId()
  const timezoneHintId = useId()
  const onceId = useId()
  const weeklyId = useId()

  const [weekOfIso, setWeekOfIso] = useState(defaultWeekOfIso)
  const [recurrence, setRecurrence] = useState<WeeklyInstagramScheduleIcsRecurrence>('once')
  const [timeZone] = useState(() => getBrowserTimeZone())

  useEffect(() => {
    if (!open) return
    setWeekOfIso(defaultWeekOfIso())
    setRecurrence('once')
  }, [open])

  function handleDownload() {
    const formatLabels = {
      story: t('formats.story'),
      post: t('formats.post'),
      carousel: t('formats.carousel'),
      reel: t('formats.reel'),
    }
    const ics = buildWeeklyInstagramScheduleIcs({
      schedule,
      weekOfIso,
      timeZone,
      recurrence,
      formatLabels,
    })
    if (!ics) {
      toast.error(t('exportError'))
      return
    }
    downloadWeeklyInstagramScheduleIcs(ics, suggestedIcsFilename(schedule.title))
    toast.success(t('exportSuccess'))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('exportDialogTitle')}</DialogTitle>
          <DialogDescription>{t('exportDialogDescription')}</DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4 py-2">
          <Field>
            <FieldLabel htmlFor={weekFieldId}>{t('weekLabel')}</FieldLabel>
            <Input
              id={weekFieldId}
              name="weekOf"
              type="date"
              autoComplete="off"
              value={weekOfIso}
              aria-describedby={weekHintId}
              onChange={(event) => setWeekOfIso(event.target.value)}
            />
            <FieldDescription id={weekHintId}>{t('weekHint')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{t('repeatLabel')}</FieldLabel>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('repeatLabel')}>
              <label
                htmlFor={onceId}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm',
                  recurrence === 'once' && 'border-foreground/40 bg-muted/40',
                )}
              >
                <input
                  id={onceId}
                  type="radio"
                  name="recurrence"
                  value="once"
                  checked={recurrence === 'once'}
                  className="size-4 accent-foreground"
                  onChange={() => setRecurrence('once')}
                />
                <span>{t('repeatOnce')}</span>
              </label>
              <label
                htmlFor={weeklyId}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm',
                  recurrence === 'weekly' && 'border-foreground/40 bg-muted/40',
                )}
              >
                <input
                  id={weeklyId}
                  type="radio"
                  name="recurrence"
                  value="weekly"
                  checked={recurrence === 'weekly'}
                  className="size-4 accent-foreground"
                  onChange={() => setRecurrence('weekly')}
                />
                <span>{t('repeatWeekly')}</span>
              </label>
            </div>
          </Field>

          <Field>
            <FieldLabel>{t('timezoneLabel')}</FieldLabel>
            <p className="text-sm text-foreground" aria-describedby={timezoneHintId}>
              {timeZone}
            </p>
            <FieldDescription id={timezoneHintId}>
              {t('timezoneHint', { timeZone })}
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancelButton')}
          </Button>
          <Button type="button" onClick={handleDownload} disabled={!weekOfIso}>
            {t('downloadButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
