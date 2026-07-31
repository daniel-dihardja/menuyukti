'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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
} from '@/lib/calendar/client-api'
import { parseIsoDateOnly } from '@/lib/calendar/scheduler-dates'
import { useCloseLabel } from '@/hooks/use-close-label'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { useFieldIds } from '@/hooks/use-field-ids'

import { CalendarMediaRefPicker } from './calendar-media-ref-picker'

export type CalendarEntryDialogValues = {
  id?: number
  title: string
  description: string
  dateIso: string
  time: string
  mediaRefs: CalendarMediaRef[]
}

export type CreateCalendarEntryDialogValues = Omit<CalendarEntryDialogValues, 'id'>

export type EditCalendarEntryDialogValues = CalendarEntryDialogValues & {
  id: number
}

type SharedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: number
  locale: string
  onSaved?: () => void
}

type CreateCalendarEntryDialogProps = SharedDialogProps & {
  initial: CreateCalendarEntryDialogValues
}

type EditCalendarEntryDialogProps = Omit<SharedDialogProps, 'locationId'> & {
  initial: EditCalendarEntryDialogValues
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

type FormSnapshot = {
  title: string
  description: string
  dateIso: string
  time: string
  mediaRefs: CalendarMediaRef[]
}

function useCalendarEntryForm(open: boolean, initial: FormSnapshot, resetKey?: number) {
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

  const isDirty =
    title !== initial.title ||
    description !== initial.description ||
    dateIso !== initial.dateIso ||
    time !== initial.time ||
    !mediaRefsEqual(mediaRefs, initial.mediaRefs)

  const saveDisabled =
    pending || deleting || title.trim().length === 0 || !/^\d{2}:\d{2}$/.test(time)

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
  }, [
    open,
    resetKey,
    initial.title,
    initial.description,
    initial.dateIso,
    initial.time,
    initial.mediaRefs,
  ])

  const validate = (): { titleClean: string; timeClean: string } | null => {
    const titleClean = title.trim()
    const timeClean = time.trim()
    const titleInvalid = titleClean.length === 0
    const timeInvalid = !/^\d{2}:\d{2}$/.test(timeClean)
    setTitleError(titleInvalid)
    setTimeError(timeInvalid)
    if (titleInvalid || timeInvalid || pending || deleting) return null
    return { titleClean, timeClean }
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    dateIso,
    time,
    setTime,
    mediaRefs,
    setMediaRefs,
    pending,
    setPending,
    deleting,
    setDeleting,
    titleError,
    setTitleError,
    timeError,
    setTimeError,
    discardOpen,
    setDiscardOpen,
    isDirty,
    saveDisabled,
    validate,
  }
}

function CalendarEntryDiscardDialog({
  open,
  onOpenChange,
  onConfirmDiscard,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDiscard: () => void
}) {
  const t = useTranslations('platform.calendar.createEntry')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('discardTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('discardDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('discardKeepEditing')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false)
              onConfirmDiscard()
            }}
          >
            {t('discardConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CalendarEntryFormFields({
  title,
  description,
  time,
  mediaRefs,
  pending,
  deleting,
  titleError,
  timeError,
  focusErrorNonce,
  onTitleChange,
  onDescriptionChange,
  onTimeChange,
  onMediaRefsChange,
  onClearTitleError,
  onClearTimeError,
  onSubmit,
}: {
  title: string
  description: string
  time: string
  mediaRefs: CalendarMediaRef[]
  pending: boolean
  deleting: boolean
  titleError: boolean
  timeError: boolean
  focusErrorNonce: number
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTimeChange: (value: string) => void
  onMediaRefsChange: (value: CalendarMediaRef[]) => void
  onClearTitleError: () => void
  onClearTimeError: () => void
  onSubmit: () => void
}) {
  const t = useTranslations('platform.calendar.createEntry')
  const isDesktop = useDesktopLayout()
  const titleField = useFieldIds()
  const timeField = useFieldIds()
  const descriptionField = useFieldIds()
  const titleRef = useRef<HTMLInputElement>(null)
  const timeRef = useRef<HTMLInputElement>(null)
  const busy = pending || deleting

  useLayoutEffect(() => {
    if (focusErrorNonce === 0) return
    if (titleError) {
      titleRef.current?.focus()
      return
    }
    if (timeError) {
      timeRef.current?.focus()
    }
  }, [focusErrorNonce, titleError, timeError])

  return (
    <form
      className="py-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          onSubmit()
        }
      }}
    >
      <FieldGroup className="gap-4">
        <Field data-invalid={titleError || undefined}>
          <FieldLabel htmlFor={titleField.id}>{t('titleLabel')}</FieldLabel>
          <Input
            ref={titleRef}
            id={titleField.id}
            name="title"
            autoComplete="off"
            autoFocus={isDesktop}
            value={title}
            disabled={busy}
            aria-invalid={titleError || undefined}
            aria-describedby={titleField.describedBy(titleError)}
            placeholder={t('titlePlaceholder')}
            onChange={(event) => {
              onTitleChange(event.target.value)
              if (titleError) onClearTitleError()
            }}
          />
          {titleError ? (
            <FieldError id={titleField.errorId}>{t('titleRequired')}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={timeError || undefined}>
          <FieldLabel htmlFor={timeField.id}>{t('timeLabel')}</FieldLabel>
          <Input
            ref={timeRef}
            id={timeField.id}
            name="time"
            type="time"
            autoComplete="off"
            value={time}
            disabled={busy}
            aria-invalid={timeError || undefined}
            aria-describedby={timeField.describedBy(timeError)}
            onChange={(event) => {
              onTimeChange(event.target.value)
              if (timeError) onClearTimeError()
            }}
          />
          {timeError ? <FieldError id={timeField.errorId}>{t('timeRequired')}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={descriptionField.id}>{t('descriptionLabel')}</FieldLabel>
          <Textarea
            id={descriptionField.id}
            name="description"
            autoComplete="off"
            rows={4}
            value={description}
            disabled={busy}
            aria-describedby={descriptionField.descriptionId}
            placeholder={t('descriptionPlaceholder')}
            onChange={(event) => {
              onDescriptionChange(event.target.value)
            }}
          />
          <FieldDescription id={descriptionField.descriptionId}>
            {t('descriptionHint')}
          </FieldDescription>
        </Field>

        <CalendarMediaRefPicker value={mediaRefs} onChange={onMediaRefsChange} disabled={busy} />
      </FieldGroup>
    </form>
  )
}

function CalendarEntryDialogFrame({
  open,
  onOpenChange,
  isDirty,
  pending,
  deleting,
  discardOpen,
  setDiscardOpen,
  dialogTitle,
  dialogDescription,
  footerStart,
  saveLabel,
  saveDisabled,
  onSubmit,
  children,
  extraDialogs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDirty: boolean
  pending: boolean
  deleting: boolean
  discardOpen: boolean
  setDiscardOpen: (open: boolean) => void
  dialogTitle: string
  dialogDescription: string
  footerStart: ReactNode
  saveLabel: string
  saveDisabled: boolean
  onSubmit: () => void
  children: ReactNode
  extraDialogs?: ReactNode
}) {
  const t = useTranslations('platform.calendar.createEntry')
  const closeLabel = useCloseLabel()
  const busy = pending || deleting

  const requestClose = () => {
    if (busy) return
    if (isDirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
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
            if (busy) {
              event.preventDefault()
              return
            }
            if (isDirty) {
              event.preventDefault()
              setDiscardOpen(true)
            }
          }}
          onPointerDownOutside={(event) => {
            if (busy || isDirty) {
              event.preventDefault()
              if (isDirty && !busy) setDiscardOpen(true)
            }
          }}
        >
          <DialogHeader className="shrink-0 gap-1 border-b border-border/80 bg-background px-6 py-4 pr-12">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">{children}</div>

          <DialogFooter className="relative z-10 shrink-0 flex-col gap-2 border-t border-border/80 bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {footerStart}
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={requestClose}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={saveDisabled}
                onClick={onSubmit}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {saveLabel}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CalendarEntryDiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirmDiscard={() => onOpenChange(false)}
      />

      {extraDialogs}
    </>
  )
}

export function CreateCalendarEntryDialog({
  open,
  onOpenChange,
  locationId,
  locale,
  initial,
  onSaved,
}: CreateCalendarEntryDialogProps) {
  const t = useTranslations('platform.calendar.createEntry')
  const form = useCalendarEntryForm(open, initial)
  const [focusErrorNonce, setFocusErrorNonce] = useState(0)
  const dateLabel = formatEntryDateLabel(form.dateIso, locale)

  const handleSubmit = async () => {
    const validated = form.validate()
    if (!validated) {
      setFocusErrorNonce((n) => n + 1)
      return
    }

    form.setPending(true)
    try {
      await createCalendarEntry({
        locationId,
        title: validated.titleClean,
        description: form.description.trim(),
        date: form.dateIso,
        time: validated.timeClean,
        mediaRefs: form.mediaRefs,
      })
      toast.success(t('successToast'))
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorToast'))
    } finally {
      form.setPending(false)
    }
  }

  return (
    <CalendarEntryDialogFrame
      open={open}
      onOpenChange={onOpenChange}
      isDirty={form.isDirty}
      pending={form.pending}
      deleting={form.deleting}
      discardOpen={form.discardOpen}
      setDiscardOpen={form.setDiscardOpen}
      dialogTitle={t('title')}
      dialogDescription={t('description', { date: dateLabel })}
      footerStart={<span className="hidden sm:block" aria-hidden />}
      saveLabel={t('save')}
      saveDisabled={form.saveDisabled}
      onSubmit={() => {
        void handleSubmit()
      }}
    >
      <CalendarEntryFormFields
        title={form.title}
        description={form.description}
        time={form.time}
        mediaRefs={form.mediaRefs}
        pending={form.pending}
        deleting={form.deleting}
        titleError={form.titleError}
        timeError={form.timeError}
        focusErrorNonce={focusErrorNonce}
        onTitleChange={form.setTitle}
        onDescriptionChange={form.setDescription}
        onTimeChange={form.setTime}
        onMediaRefsChange={form.setMediaRefs}
        onClearTitleError={() => form.setTitleError(false)}
        onClearTimeError={() => form.setTimeError(false)}
        onSubmit={() => {
          void handleSubmit()
        }}
      />
    </CalendarEntryDialogFrame>
  )
}

export function EditCalendarEntryDialog({
  open,
  onOpenChange,
  locale,
  initial,
  onSaved,
}: EditCalendarEntryDialogProps) {
  const t = useTranslations('platform.calendar.createEntry')
  const form = useCalendarEntryForm(open, initial, initial.id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [focusErrorNonce, setFocusErrorNonce] = useState(0)
  const dateLabel = formatEntryDateLabel(form.dateIso, locale)

  useEffect(() => {
    if (!open) return
    setDeleteOpen(false)
  }, [open, initial.id])

  const handleSubmit = async () => {
    const validated = form.validate()
    if (!validated) {
      setFocusErrorNonce((n) => n + 1)
      return
    }

    form.setPending(true)
    try {
      await updateCalendarEntry(initial.id, {
        title: validated.titleClean,
        description: form.description.trim(),
        date: form.dateIso,
        time: validated.timeClean,
        mediaRefs: form.mediaRefs,
      })
      toast.success(t('updateSuccessToast'))
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorToast'))
    } finally {
      form.setPending(false)
    }
  }

  const handleDelete = async () => {
    if (form.pending || form.deleting) return
    form.setDeleting(true)
    try {
      await deleteCalendarEntry(initial.id)
      toast.success(t('deleteSuccessToast'))
      setDeleteOpen(false)
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteErrorToast'))
    } finally {
      form.setDeleting(false)
    }
  }

  return (
    <CalendarEntryDialogFrame
      open={open}
      onOpenChange={onOpenChange}
      isDirty={form.isDirty}
      pending={form.pending}
      deleting={form.deleting}
      discardOpen={form.discardOpen}
      setDiscardOpen={form.setDiscardOpen}
      dialogTitle={t('editTitle')}
      dialogDescription={t('editDescription', { date: dateLabel })}
      footerStart={
        <Button
          type="button"
          variant="destructive"
          className="w-full sm:w-auto"
          disabled={form.pending || form.deleting}
          onClick={() => setDeleteOpen(true)}
        >
          {t('delete')}
        </Button>
      }
      saveLabel={t('saveChanges')}
      saveDisabled={form.saveDisabled}
      onSubmit={() => {
        void handleSubmit()
      }}
      extraDialogs={
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(next) => {
            if (form.deleting) return
            setDeleteOpen(next)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={form.deleting}>
                {t('deleteConfirmCancel')}
              </AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={form.deleting}
                className={form.deleting ? 'inline-flex items-center gap-2' : undefined}
                onClick={() => {
                  void handleDelete()
                }}
              >
                {form.deleting ? <Spinner /> : null}
                {t('deleteConfirmAction')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      <CalendarEntryFormFields
        title={form.title}
        description={form.description}
        time={form.time}
        mediaRefs={form.mediaRefs}
        pending={form.pending}
        deleting={form.deleting}
        titleError={form.titleError}
        timeError={form.timeError}
        focusErrorNonce={focusErrorNonce}
        onTitleChange={form.setTitle}
        onDescriptionChange={form.setDescription}
        onTimeChange={form.setTime}
        onMediaRefsChange={form.setMediaRefs}
        onClearTitleError={() => form.setTitleError(false)}
        onClearTimeError={() => form.setTimeError(false)}
        onSubmit={() => {
          void handleSubmit()
        }}
      />
    </CalendarEntryDialogFrame>
  )
}
