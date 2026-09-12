'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
  PlaybookForm,
  type PlaybookFormValues,
} from '@/app/(protected)/playbooks/_components/playbook-form'
import { PublicHolidaysWorkspace } from '@/app/(protected)/playbooks/_components/public-holidays-workspace'
import type { PlaybookCatalogEntry } from '@/lib/playbooks/catalog'
import { updatePlaybook } from '@/lib/playbooks/client-api'

type Branch = {
  id: number
  name: string
}

type PublicHolidaysInstanceClientProps = {
  playbookId: number
  catalog: PlaybookCatalogEntry
  branches: Branch[]
  initialValues: PlaybookFormValues
}

export function PublicHolidaysInstanceClient({
  playbookId,
  catalog,
  branches,
  initialValues,
}: PublicHolidaysInstanceClientProps) {
  const router = useRouter()
  const tPlaybooks = useTranslations('playbooks')
  const [values, setValues] = useState<PlaybookFormValues>(initialValues)
  const [fieldsDisabled, setFieldsDisabled] = useState(false)

  async function prepareRun(): Promise<{
    locationId: number
    startDate: string
    endDate: string
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
    if (!values.startDate) {
      toast.error(tPlaybooks('validation.startRequired'))
      throw new Error('validation')
    }
    if (!values.endDate) {
      toast.error(tPlaybooks('validation.endRequired'))
      throw new Error('validation')
    }
    if (values.endDate < values.startDate) {
      toast.error(tPlaybooks('validation.endBeforeStart'))
      throw new Error('validation')
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
    router.refresh()

    return {
      locationId: updated.locationId,
      startDate: updated.startDate,
      endDate: updated.endDate,
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PlaybookForm
        mode="edit"
        playbookId={playbookId}
        catalog={catalog}
        branches={branches}
        hideSubmit
        value={values}
        onValueChange={setValues}
        disabled={fieldsDisabled}
      />
      <PublicHolidaysWorkspace prepareRun={prepareRun} onRunningChange={setFieldsDisabled} />
    </div>
  )
}
