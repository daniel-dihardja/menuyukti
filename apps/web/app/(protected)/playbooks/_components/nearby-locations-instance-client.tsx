'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
  NearbyLocationsForm,
  type NearbyLocationsFormValues,
} from '@/app/(protected)/playbooks/_components/nearby-locations-form'
import { NearbyLocationsWorkspace } from '@/app/(protected)/playbooks/_components/nearby-locations-workspace'
import type { PlaybookCatalogEntry } from '@/lib/playbooks/catalog'
import { updatePlaybook } from '@/lib/playbooks/client-api'
import {
  loadNearbyScanConfig,
  stashNearbyScanConfig,
  todayIsoDate,
  type NearbyLocationBranch,
} from '@/lib/playbooks/nearby-locations'

type NearbyLocationsInstanceClientProps = {
  playbookId: number
  catalog: PlaybookCatalogEntry
  branches: NearbyLocationBranch[]
  initialValues: NearbyLocationsFormValues
}

export function NearbyLocationsInstanceClient({
  playbookId,
  catalog,
  branches,
  initialValues,
}: NearbyLocationsInstanceClientProps) {
  const router = useRouter()
  const tPlaybooks = useTranslations('playbooks')
  const [values, setValues] = useState<NearbyLocationsFormValues>(initialValues)
  const [hydrated, setHydrated] = useState(false)
  const [fieldsDisabled, setFieldsDisabled] = useState(false)

  useEffect(() => {
    const stashed = loadNearbyScanConfig(playbookId)
    if (stashed) {
      setValues((prev) => ({
        ...prev,
        address: stashed.address || prev.address,
        instructions: stashed.instructions,
        focus: stashed.focus.length > 0 ? stashed.focus : prev.focus,
      }))
    }
    setHydrated(true)
  }, [playbookId])

  async function prepareRun(): Promise<{
    locationId: number
    address: string
    instructions: string
    focus: NearbyLocationsFormValues['focus']
  }> {
    const nameClean = values.name.trim()
    if (!nameClean) {
      toast.error(tPlaybooks('validation.nameRequired'))
      throw new Error('validation')
    }
    if (values.locationId === null) {
      toast.error(tPlaybooks('validation.locationRequired'))
      throw new Error('validation')
    }
    if (!values.address.trim()) {
      toast.error(tPlaybooks('validation.addressRequired'))
      throw new Error('validation')
    }
    if (values.focus.length === 0) {
      toast.error(tPlaybooks('validation.focusRequired'))
      throw new Error('validation')
    }

    const today = todayIsoDate()
    const updated = await updatePlaybook(playbookId, {
      locationId: values.locationId,
      name: nameClean,
      startDate: today,
      endDate: today,
    })
    const nextValues: NearbyLocationsFormValues = {
      name: updated.name,
      locationId: updated.locationId,
      address: values.address.trim(),
      instructions: values.instructions.trim(),
      focus: values.focus,
    }
    setValues(nextValues)
    stashNearbyScanConfig(playbookId, {
      address: nextValues.address,
      instructions: nextValues.instructions,
      focus: nextValues.focus,
    })
    router.refresh()

    return {
      locationId: updated.locationId,
      address: nextValues.address,
      instructions: nextValues.instructions,
      focus: nextValues.focus,
    }
  }

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <NearbyLocationsForm
          mode="edit"
          playbookId={playbookId}
          catalog={catalog}
          branches={branches}
          hideSubmit
          value={values}
          onValueChange={setValues}
          disabled
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <NearbyLocationsForm
        mode="edit"
        playbookId={playbookId}
        catalog={catalog}
        branches={branches}
        hideSubmit
        value={values}
        onValueChange={setValues}
        disabled={fieldsDisabled}
      />
      <NearbyLocationsWorkspace prepareRun={prepareRun} onRunningChange={setFieldsDisabled} />
    </div>
  )
}
