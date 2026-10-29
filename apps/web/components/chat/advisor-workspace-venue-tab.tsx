'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { LocationForm } from '@/app/(protected)/analytics/locations/location-form'
import type { LocationFormValues } from '@/app/(protected)/analytics/locations/location-form-types'
import {
  mapLocationToFormValues,
  type LocationDetailPayload,
} from '@/lib/locations/map-location-to-form-values'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

type Props = {
  locationId: number
}

export function AdvisorWorkspaceVenueTab({ locationId }: Props) {
  const t = useTranslations('chat.workspace')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [initialValues, setInitialValues] = useState<LocationFormValues | null>(null)
  const [initialManualQuickProfile, setInitialManualQuickProfile] = useState<Record<
    string,
    unknown
  > | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('venueLoadError'))
      }
      const data = (await res.json()) as { location: LocationDetailPayload }
      const mapped = mapLocationToFormValues(data.location)
      setInitialValues(mapped.initialValues)
      setInitialManualQuickProfile(mapped.initialManualQuickProfile)
      setFormKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('venueLoadError'))
      setInitialValues(null)
    } finally {
      setLoading(false)
    }
  }, [locationId, t])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !initialValues) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <p className="text-destructive text-sm">{error ?? t('venueLoadError')}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t('venueRetry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <LocationForm
        key={`${locationId}-${formKey}`}
        mode="edit"
        locationId={String(locationId)}
        initialValues={initialValues}
        initialManualQuickProfile={initialManualQuickProfile}
        variant="rail"
        onSaved={() => void load()}
      />
      <p className="text-muted-foreground text-xs">
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={routes.analytics.branchesDetail(locationId)}
        >
          {t('venueAdvancedLink')}
        </Link>
      </p>
    </div>
  )
}
