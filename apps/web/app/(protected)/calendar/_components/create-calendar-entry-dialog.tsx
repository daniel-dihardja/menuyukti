'use client'

import { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'

import {
  createCalendarEntry,
  updateCalendarEntry,
  type CalendarMediaRef,
} from '@/lib/calendar/client-api'
import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import { useCloseLabel } from '@/hooks/use-close-label'

import { CalendarMediaRefPicker } from './calendar-media-ref-picker'

export type CalendarEntryDialogValues = {
  id?: number
  title: string
  description: string
  dateIso: string
  time: string
  mediaRefs: CalendarMediaRef[]
}

type CalendarEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: number
  locale: string
  /** Create: date only. Edit: full entry values including id. */
  initial: CalendarEntryDialogValues
  onSaved?: () => void
}

function formatEntryDateLabel(isoDate: string, locale: string): string {
  const date = parseIsoDateOnly(isoDate)
  if (!date) return isoDate
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function mediaRefsEqual(a: CalendarMediaRef[], b: CalendarMediaRef[]): boolean {
  if (a.length !== b.length) return false
  return a.every((ref, i) => ref.kind === b[i]?.kind && ref.name === b[i]?.name)
}

export function CalendarEntryDialog({
  open,
  onOpenChange,
  locationId,
  locale,
  initial,
  onSaved,
}: CalendarEntryDialogProps) {
  const t = useTranslations('platform.calendar.createEntry')
  const closeLabel = useCloseLabel()
  const titleId = useId()
  const timeId = useId()
  const descriptionId = useId()

  const isEdit = initial.id != null

  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [dateIso, setDateIso] = useState(initial.dateIso)
  const [time, setTime] = useState(initial.time)
  const [mediaRefs, setMediaRefs] = useState<CalendarMediaRef[]>(initial.mediaRefs)
  const [pending, setPending] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [timeError, setTimeError] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  const dateLabel = formatEntryDateLabel(dateIso, locale)
  const isDirty =
    title !== initial.title ||
    description !== initial.description ||
    dateIso !== initial.dateIso ||
    time !== initial.time ||
    !mediaRefsEqual(mediaRefs, initial.mediaRefs)

  useEffect(() => {
    if (!open) return
    setTitle(initial.title)
    setDescription(initial.description)
    setDateIso(initial.dateIso)
    setTime(initial.time)
    setMediaRefs(initial.mediaRefs)
    setPending(false)
    setTitleError(false)
    setTimeError(false)
    setDiscardOpen(false)
  }, [
    open,
    initial.id,
    initial.title,
    initial.description,
    initial.dateIso,
    initial.time,
    initial.mediaRefs,
  ])

  const requestClose = () => {
    if (pending) return
    if (isDirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    const titleClean = title.trim()
    const timeClean = time.trim()
    const titleInvalid = titleClean.length === 0
    const timeInvalid = !/^\d{2}:\d{2}$/.test(timeClean)
    setTitleError(titleInvalid)
    setTimeError(timeInvalid)
    if (titleInvalid || timeInvalid || pending) return

    setPending(true)
    try {
      if (isEdit && initial.id != null) {
        await updateCalendarEntry(initial.id, {
          title: titleClean,
          description: description.trim(),
          date: dateIso,
          time: timeClean,
          mediaRefs,
        })
        toast.success(t('updateSuccessToast'))
      } else {
        await createCalendarEntry({
          locationId,
          title: titleClean,
          description: description.trim(),
          date: dateIso,
          time: timeClean,
          mediaRefs,
        })
        toast.success(t('successToast'))
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorToast'))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            requestClose()
            return
          }
          onOpenChange(true)
        }}
      >
        <DialogContent
          className="flex max-h-[min(92vh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          closeLabel={closeLabel}
          onEscapeKeyDown={(event) => {
            if (pending) {
              event.preventDefault()
              return
            }
            if (isDirty) {
              event.preventDefault()
              setDiscardOpen(true)
            }
          }}
          onPointerDownOutside={(event) => {
            if (pending || isDirty) {
              event.preventDefault()
              if (isDirty && !pending) setDiscardOpen(true)
            }
          }}
        >
          <DialogHeader className="gap-1 border-b border-border/80 px-6 py-4">
            <DialogTitle>{isEdit ? t('editTitle') : t('title')}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? t('editDescription', { date: dateLabel })
                : t('description', { date: dateLabel })}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 px-6">
            <form
              className="py-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
            >
              <FieldGroup className="gap-4">
                <Field data-invalid={titleError || undefined}>
                  <FieldLabel htmlFor={titleId}>{t('titleLabel')}</FieldLabel>
                  <Input
                    id={titleId}
                    autoFocus
                    value={title}
                    disabled={pending}
                    aria-invalid={titleError || undefined}
                    placeholder={t('titlePlaceholder')}
                    onChange={(event) => {
                      setTitle(event.target.value)
                      if (titleError) setTitleError(false)
                    }}
                  />
                  {titleError ? <FieldError>{t('titleRequired')}</FieldError> : null}
                </Field>

                <Field data-invalid={timeError || undefined}>
                  <FieldLabel htmlFor={timeId}>{t('timeLabel')}</FieldLabel>
                  <Input
                    id={timeId}
                    type="time"
                    value={time}
                    disabled={pending}
                    aria-invalid={timeError || undefined}
                    onChange={(event) => {
                      setTime(event.target.value)
                      if (timeError) setTimeError(false)
                    }}
                  />
                  {timeError ? <FieldError>{t('timeRequired')}</FieldError> : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={descriptionId}>{t('descriptionLabel')}</FieldLabel>
                  <Textarea
                    id={descriptionId}
                    rows={4}
                    value={description}
                    disabled={pending}
                    placeholder={t('descriptionPlaceholder')}
                    onChange={(event) => {
                      setDescription(event.target.value)
                    }}
                  />
                  <FieldDescription>{t('descriptionHint')}</FieldDescription>
                </Field>

                <CalendarMediaRefPicker
                  value={mediaRefs}
                  onChange={setMediaRefs}
                  disabled={pending}
                />
              </FieldGroup>
            </form>
          </ScrollArea>

          <DialogFooter className="border-t border-border/80 px-6 py-4">
            <Button type="button" variant="outline" disabled={pending} onClick={requestClose}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={pending || title.trim().length === 0 || !/^\d{2}:\d{2}$/.test(time)}
              onClick={() => {
                void handleSubmit()
              }}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {isEdit ? t('saveChanges') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('discardDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('discardKeepEditing')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false)
                onOpenChange(false)
              }}
            >
              {t('discardConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
