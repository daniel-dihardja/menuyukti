'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { QrCode } from 'lucide-react'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
  initialLocationId: number | null
}

export function RegistrationsClient({ branches, initialLocationId }: Props) {
  const t = useTranslations('platform.crm.registrations')
  const router = useRouter()
  const { locationId, setLocationId } = useAnalytics()

  // URL → context only when the URL param changes (avoids fighting user selection mid-navigation).
  useEffect(() => {
    if (initialLocationId !== null) {
      setLocationId(initialLocationId)
    }
  }, [initialLocationId, setLocationId])

  // No URL: keep a valid stored selection, or auto-select the only branch.
  useEffect(() => {
    if (initialLocationId !== null) return
    if (locationId !== null) {
      if (branches.length > 0 && !branches.some((b) => b.id === locationId)) {
        setLocationId(null)
      }
      return
    }
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (!onlyBranch) return
    setLocationId(onlyBranch.id)
  }, [initialLocationId, locationId, branches, setLocationId])

  useEffect(() => {
    if (locationId === null) return
    if (locationId === initialLocationId) return
    router.replace(routes.crmRegistrationsWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  const activeLocationId = locationId ?? initialLocationId

  if (branches.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noLocations')}</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <LocationSelect
          branches={branches}
          id="crm-registrations-location-select"
          label={t('branchLabel')}
          placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
          description={t('branchDescription')}
          className="w-full max-w-none sm:max-w-xs"
        />
        <Button type="button" disabled title={t('enrollQrSoon')} className="shrink-0 gap-2">
          <QrCode className="size-4" aria-hidden />
          {t('enrollQr')}
        </Button>
      </div>

      {activeLocationId === null ? (
        <p className="text-sm text-muted-foreground">{t('selectBranch')}</p>
      ) : (
        <div
          className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border px-6 py-12"
          role="status"
        >
          <p className="text-base font-medium tracking-tight">{t('emptyTitle')}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      )}
    </div>
  )
}
