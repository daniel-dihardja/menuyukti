'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { createPlaybook, updatePlaybook } from '@/lib/playbooks/client-api'
import type { PlaybookCatalogEntry } from '@/lib/playbooks/catalog'
import {
  NEARBY_FOCUS_IDS,
  formatLocationAddress,
  stashNearbyScanConfig,
  todayIsoDate,
  type NearbyFocusId,
  type NearbyLocationBranch,
  type NearbyScanConfig,
} from '@/lib/playbooks/nearby-locations'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

export type NearbyLocationsFormValues = {
  name: string
  locationId: number | null
  address: string
  instructions: string
  focus: NearbyFocusId[]
}

type NearbyLocationsFormProps = {
  branches: NearbyLocationBranch[]
  catalog: PlaybookCatalogEntry
  mode: 'create' | 'edit'
  playbookId?: number
  initialValues?: NearbyLocationsFormValues
  hideSubmit?: boolean
  value?: NearbyLocationsFormValues
  onValueChange?: (next: NearbyLocationsFormValues) => void
  disabled?: boolean
}

function defaultValues(
  initialValues: NearbyLocationsFormValues | undefined,
  branches: NearbyLocationBranch[],
): NearbyLocationsFormValues {
  const locationId =
    initialValues?.locationId ?? (branches.length === 1 ? (branches[0]?.id ?? null) : null)
  const branch = locationId != null ? branches.find((b) => b.id === locationId) : undefined
  return {
    name: initialValues?.name ?? '',
    locationId,
    address: initialValues?.address ?? (branch ? formatLocationAddress(branch) : ''),
    instructions: initialValues?.instructions ?? '',
    focus: initialValues?.focus ?? ['lunch_demand', 'competitors'],
  }
}

export function NearbyLocationsForm({
  branches,
  catalog,
  mode,
  playbookId,
  initialValues,
  hideSubmit = false,
  value: controlledValue,
  onValueChange,
  disabled = false,
}: NearbyLocationsFormProps) {
  const t = useTranslations(`playbooks.items.${catalog.id}.form`)
  const tPlaybooks = useTranslations('playbooks')
  const router = useRouter()
  const isControlled = controlledValue !== undefined && onValueChange !== undefined
  const [uncontrolled, setUncontrolled] = useState(() => defaultValues(initialValues, branches))
  const values = isControlled ? controlledValue : uncontrolled
  const [pending, setPending] = useState(false)
  const addressTouchedRef = useRef(Boolean(initialValues?.address?.trim()))

  function setValues(next: NearbyLocationsFormValues) {
    if (isControlled) {
      onValueChange(next)
    } else {
      setUncontrolled(next)
    }
  }

  useEffect(() => {
    if (addressTouchedRef.current) return
    if (values.locationId == null) return
    const branch = branches.find((b) => b.id === values.locationId)
    if (!branch) return
    const nextAddress = formatLocationAddress(branch)
    if (!nextAddress || nextAddress === values.address) return
    setValues({ ...values, address: nextAddress })
    // Only react to location / branch address changes for autofill.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid loop on every values change
  }, [values.locationId, branches])

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

  function toScanConfig(v: NearbyLocationsFormValues): NearbyScanConfig {
    return {
      address: v.address.trim(),
      instructions: v.instructions.trim(),
      focus: v.focus,
    }
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
    if (!values.address.trim()) {
      toast.error(tPlaybooks('validation.addressRequired'))
      return
    }
    if (values.focus.length === 0) {
      toast.error(tPlaybooks('validation.focusRequired'))
      return
    }

    const today = todayIsoDate()
    setPending(true)
    try {
      if (mode === 'create') {
        const created = await createPlaybook({
          locationId: values.locationId,
          name: nameClean,
          playbookType: catalog.playbookType,
          startDate: today,
          endDate: today,
        })
        stashNearbyScanConfig(created.id, toScanConfig(values))
        toast.success(tPlaybooks('toast.created'))
        router.push(routes.playbookDetail(catalog.slug))
        router.refresh()
        return
      }

      if (playbookId == null) {
        throw new Error('Missing playbook id')
      }
      await updatePlaybook(playbookId, {
        locationId: values.locationId,
        name: nameClean,
        startDate: today,
        endDate: today,
      })
      stashNearbyScanConfig(playbookId, toScanConfig(values))
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
          <FieldLabel htmlFor="nearby-playbook-name">{t('nameLabel')}</FieldLabel>
          <Input
            id="nearby-playbook-name"
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
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          id="nearby-playbook-location"
          label={t('locationLabel')}
          placeholder={t('locationPlaceholder')}
          description={t('locationDescription')}
          className="w-full max-w-none"
          value={values.locationId}
          onValueChange={(locationId) => {
            addressTouchedRef.current = false
            const branch = branches.find((b) => b.id === locationId)
            setValues({
              ...values,
              locationId,
              address: branch ? formatLocationAddress(branch) : values.address,
            })
          }}
          disabled={fieldsLocked}
        />

        <Field>
          <FieldLabel htmlFor="nearby-playbook-address">{t('addressLabel')}</FieldLabel>
          <Input
            id="nearby-playbook-address"
            name="address"
            autoComplete="street-address"
            placeholder={t('addressPlaceholder')}
            value={values.address}
            onChange={(e) => {
              addressTouchedRef.current = true
              setValues({ ...values, address: e.target.value })
            }}
            disabled={fieldsLocked}
            required
          />
          <FieldDescription>{t('addressDescription')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="nearby-playbook-instructions">{t('instructionsLabel')}</FieldLabel>
          <Textarea
            id="nearby-playbook-instructions"
            name="instructions"
            rows={4}
            placeholder={t('instructionsPlaceholder')}
            value={values.instructions}
            onChange={(e) => setValues({ ...values, instructions: e.target.value })}
            disabled={fieldsLocked}
          />
          <FieldDescription>{t('instructionsDescription')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>{t('focusLabel')}</FieldLabel>
          <ToggleGroup
            type="multiple"
            value={values.focus}
            onValueChange={(next) => {
              const focus = next.filter((id): id is NearbyFocusId =>
                (NEARBY_FOCUS_IDS as readonly string[]).includes(id),
              )
              setValues({ ...values, focus })
            }}
            disabled={fieldsLocked}
            aria-label={t('focusLabel')}
          >
            {NEARBY_FOCUS_IDS.map((id) => (
              <ToggleGroupItem key={id} value={id}>
                {t(`focus.${id}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{t('focusDescription')}</FieldDescription>
        </Field>
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
