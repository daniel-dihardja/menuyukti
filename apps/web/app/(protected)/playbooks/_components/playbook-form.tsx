'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { createPlaybook, updatePlaybook } from '@/lib/playbooks/client-api'
import type { PlaybookCatalogEntry } from '@/lib/playbooks/catalog'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'

type Branch = {
  id: number
  name: string
}

export type PlaybookFormValues = {
  name: string
  locationId: number | null
  startDate: string
  endDate: string
}

type PlaybookFormProps = {
  branches: Branch[]
  catalog: PlaybookCatalogEntry
  mode: 'create' | 'edit'
  playbookId?: number
  initialValues?: PlaybookFormValues
  /** Hide the Save button (e.g. when Run persists settings). */
  hideSubmit?: boolean
  /** Controlled values — when set with onValueChange, fields are controlled by the parent. */
  value?: PlaybookFormValues
  onValueChange?: (next: PlaybookFormValues) => void
  disabled?: boolean
}

function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function plusMonthsIsoDate(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultValues(initialValues: PlaybookFormValues | undefined, branches: Branch[]): PlaybookFormValues {
  return {
    name: initialValues?.name ?? '',
    locationId:
      initialValues?.locationId ?? (branches.length === 1 ? (branches[0]?.id ?? null) : null),
    startDate: initialValues?.startDate ?? todayIsoDate(),
    endDate: initialValues?.endDate ?? plusMonthsIsoDate(3),
  }
}

export function PlaybookForm({
  branches,
  catalog,
  mode,
  playbookId,
  initialValues,
  hideSubmit = false,
  value: controlledValue,
  onValueChange,
  disabled = false,
}: PlaybookFormProps) {
  const t = useTranslations(`playbooks.items.${catalog.id}.form`)
  const tPlaybooks = useTranslations('playbooks')
  const router = useRouter()
  const isControlled = controlledValue !== undefined && onValueChange !== undefined
  const [uncontrolled, setUncontrolled] = useState(() => defaultValues(initialValues, branches))
  const values = isControlled ? controlledValue : uncontrolled
  const [pending, setPending] = useState(false)

  function setValues(next: PlaybookFormValues) {
    if (isControlled) {
      onValueChange(next)
    } else {
      setUncontrolled(next)
    }
  }

  const fieldsLocked = pending || disabled

  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border/70 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">{t('noLocationsTitle')}</p>
          <p className="text-muted-foreground max-w-md text-sm">{t('noLocationsDescription')}</p>
        </div>
        <Button asChild>
          <Link href={routes.analytics.branchesCreate}>{t('noLocationsCta')}</Link>
        </Button>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || hideSubmit) return

    const nameClean = values.name.trim()
    if (!nameClean) {
      toast.error(tPlaybooks('validation.nameRequired'))
      return
    }
    if (values.locationId === null) {
      toast.error(tPlaybooks('validation.locationRequired'))
      return
    }
    if (!values.startDate) {
      toast.error(tPlaybooks('validation.startRequired'))
      return
    }
    if (!values.endDate) {
      toast.error(tPlaybooks('validation.endRequired'))
      return
    }
    if (values.endDate < values.startDate) {
      toast.error(tPlaybooks('validation.endBeforeStart'))
      return
    }

    setPending(true)
    try {
      if (mode === 'create') {
        await createPlaybook({
          locationId: values.locationId,
          name: nameClean,
          playbookType: catalog.playbookType,
          startDate: values.startDate,
          endDate: values.endDate,
        })
        toast.success(tPlaybooks('toast.created'))
        router.push(routes.playbookDetail(catalog.slug))
        router.refresh()
        return
      }

      if (playbookId == null) {
        throw new Error('Missing playbook id')
      }
      const updated = await updatePlaybook(playbookId, {
        locationId: values.locationId,
        name: nameClean,
        startDate: values.startDate,
        endDate: values.endDate,
      })
      setValues({
        name: updated.name,
        locationId: updated.locationId,
        startDate: updated.startDate,
        endDate: updated.endDate,
      })
      toast.success(tPlaybooks('toast.updated'))
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : mode === 'create'
            ? tPlaybooks('toast.createError')
            : tPlaybooks('toast.updateError'),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="playbook-name">{t('nameLabel')}</FieldLabel>
          <Input
            id="playbook-name"
            name="name"
            autoComplete="off"
            placeholder={t('namePlaceholder')}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            disabled={fieldsLocked}
            required
          />
        </Field>

        <LocationSelect
          branches={branches}
          id="playbook-location"
          label={t('locationLabel')}
          placeholder={t('locationPlaceholder')}
          description={t('locationDescription')}
          className="w-full max-w-none"
          value={values.locationId}
          onValueChange={(locationId) => setValues({ ...values, locationId })}
          disabled={fieldsLocked}
        />

        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="playbook-start-date">{t('startDateLabel')}</FieldLabel>
            <DatePicker
              id="playbook-start-date"
              value={values.startDate || undefined}
              onChange={(startDate) => {
                const next = { ...values, startDate }
                if (values.endDate && values.endDate < startDate) {
                  next.endDate = startDate
                }
                setValues(next)
              }}
              disabled={fieldsLocked}
              placeholder={t('datePlaceholder')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="playbook-end-date">{t('endDateLabel')}</FieldLabel>
            <DatePicker
              id="playbook-end-date"
              value={values.endDate || undefined}
              onChange={(endDate) => setValues({ ...values, endDate })}
              disabled={fieldsLocked}
              min={values.startDate || undefined}
              placeholder={t('datePlaceholder')}
            />
          </Field>
        </FieldGroup>
      </FieldGroup>

      {!hideSubmit ? (
        <div>
          <Button type="submit" disabled={fieldsLocked}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? tPlaybooks('saving') : tPlaybooks('save')}
          </Button>
        </div>
      ) : null}
    </form>
  )
}
