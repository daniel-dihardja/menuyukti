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
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'

import {
  createCalendarEntry,
  deleteCalendarEntry,
  updateCalendarEntry,
  type CalendarMediaRef,
  type CalendarSourceRef,
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
  sourceRef?: CalendarSourceRef | null
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
  const [deleting, setDeleting] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [timeError, setTimeError] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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
    setDeleting(false)
    setTitleError(false)
    setTimeError(false)
    setDiscardOpen(false)
    setDeleteOpen(false)
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
    if (pending || deleting) return
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
    if (titleInvalid || timeInvalid || pending || deleting) return

    setPending(true)
    try {
      if (isEdit && initial.id != null) {
        await updateCalendarEntry(initial.id, {
          title: titleClean,
          description: description.trim(),
          date: dateIso,
          time: timeClean,
          mediaRefs,
          ...(initial.sourceRef ? { sourceRef: initial.sourceRef } : {}),
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
          ...(initial.sourceRef ? { sourceRef: initial.sourceRef } : {}),
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

  const handleDelete = async () => {
    if (!isEdit || initial.id == null || pending || deleting) return
    setDeleting(true)
    try {
      await deleteCalendarEntry(initial.id)
      toast.success(t('deleteSuccessToast'))
      setDeleteOpen(false)
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteErrorToast'))
    } finally {
      setDeleting(false)
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
          className="flex max-h-[min(92vh,40rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          closeLabel={closeLabel}
          onEscapeKeyDown={(event) => {
            if (pending || deleting) {
              event.preventDefault()
              return
            }
            if (isDirty) {
              event.preventDefault()
              setDiscardOpen(true)
            }
          }}
          onPointerDownOutside={(event) => {
            if (pending || deleting || isDirty) {
              event.preventDefault()
              if (isDirty && !pending && !deleting) setDiscardOpen(true)
            }
          }}
        >
          <DialogHeader className="shrink-0 gap-1 border-b border-border/80 bg-background px-6 py-4 pr-12">
            <DialogTitle>{isEdit ? t('editTitle') : t('title')}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? t('editDescription', { date: dateLabel })
                : t('description', { date: dateLabel })}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
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
                    disabled={pending || deleting}
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
                    disabled={pending || deleting}
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
                    disabled={pending || deleting}
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
                  disabled={pending || deleting}
                />
              </FieldGroup>
            </form>
          </div>

          <DialogFooter className="relative z-10 shrink-0 flex-col gap-2 border-t border-border/80 bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={pending || deleting}
                onClick={() => setDeleteOpen(true)}
              >
                {t('delete')}
              </Button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={pending || deleting}
                onClick={requestClose}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={
                  pending || deleting || title.trim().length === 0 || !/^\d{2}:\d{2}$/.test(time)
                }
                onClick={() => {
                  void handleSubmit()
                }}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {isEdit ? t('saveChanges') : t('save')}
              </Button>
            </div>
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

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (deleting) return
          setDeleteOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('deleteConfirmCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className={deleting ? 'inline-flex items-center gap-2' : undefined}
              onClick={() => {
                void handleDelete()
              }}
            >
              {deleting ? <Spinner /> : null}
              {t('deleteConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
