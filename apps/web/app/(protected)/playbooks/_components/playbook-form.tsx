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

export function PlaybookForm({
  branches,
  catalog,
  mode,
  playbookId,
  initialValues,
}: PlaybookFormProps) {
  const t = useTranslations(`playbooks.items.${catalog.id}.form`)
  const tPlaybooks = useTranslations('playbooks')
  const router = useRouter()
  const [name, setName] = useState(initialValues?.name ?? '')
  const [locationId, setLocationId] = useState<number | null>(
    initialValues?.locationId ?? (branches.length === 1 ? (branches[0]?.id ?? null) : null),
  )
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? todayIsoDate)
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? (() => plusMonthsIsoDate(3)))
  const [pending, setPending] = useState(false)

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
    if (pending) return

    const nameClean = name.trim()
    if (!nameClean) {
      toast.error(tPlaybooks('validation.nameRequired'))
      return
    }
    if (locationId === null) {
      toast.error(tPlaybooks('validation.locationRequired'))
      return
    }
    if (!startDate) {
      toast.error(tPlaybooks('validation.startRequired'))
      return
    }
    if (!endDate) {
      toast.error(tPlaybooks('validation.endRequired'))
      return
    }
    if (endDate < startDate) {
      toast.error(tPlaybooks('validation.endBeforeStart'))
      return
    }

    setPending(true)
    try {
      if (mode === 'create') {
        await createPlaybook({
          locationId,
          name: nameClean,
          playbookType: catalog.playbookType,
          startDate,
          endDate,
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
        locationId,
        name: nameClean,
        startDate,
        endDate,
      })
      setName(updated.name)
      setLocationId(updated.locationId)
      setStartDate(updated.startDate)
      setEndDate(updated.endDate)
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
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
          value={locationId}
          onValueChange={setLocationId}
        />

        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="playbook-start-date">{t('startDateLabel')}</FieldLabel>
            <Input
              id="playbook-start-date"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={pending}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="playbook-end-date">{t('endDateLabel')}</FieldLabel>
            <Input
              id="playbook-end-date"
              name="endDate"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={pending}
              required
            />
          </Field>
        </FieldGroup>
      </FieldGroup>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? tPlaybooks('saving') : tPlaybooks('save')}
        </Button>
      </div>
    </form>
  )
}
