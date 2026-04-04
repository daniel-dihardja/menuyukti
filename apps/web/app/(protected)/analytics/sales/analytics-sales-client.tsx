'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { LocationSelect } from './location-select'
import { SalesTable } from './sales-table'
import { useLocationAnalytics } from './use-location-analytics'
import { useDeleteAnalytics } from './use-delete-analytics'
import { routes } from '@/lib/routes'
import { useAnalytics } from '../use-analytics'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
}

export function AnalyticsSalesClient({ branches }: Props) {
  const t = useTranslations('analytics.sales')
  const router = useRouter()

  const { locationId, setLocationId } = useAnalytics()

  useEffect(() => {
    if (locationId !== null) return
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (!onlyBranch) return
    setLocationId(onlyBranch.id)
  }, [locationId, branches, setLocationId])

  const { analytics: uploads, loading, refetch } = useLocationAnalytics(locationId)
  const { deleteAnalytics } = useDeleteAnalytics({
    locationId,
    onSuccess: refetch,
  })

  const hasUploads = uploads.length > 0

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <LocationSelect
          branches={branches}
          id="sales-location-select"
          label={t('branchLabel')}
          placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
          className="w-full max-w-none sm:max-w-xs"
        />
      </section>

      {!locationId ? (
        <div className="border rounded-md p-8 text-left text-muted-foreground">
          {t('selectBranch')}
        </div>
      ) : loading ? (
        <div className="border rounded-md p-8 text-left">{t('loading')}</div>
      ) : !hasUploads ? (
        <div className="border rounded-md p-8 text-left space-y-4">
          <h2 className="text-lg font-medium">{t('noAnalytics.title')}</h2>
          <p className="text-muted-foreground">{t('noAnalytics.description')}</p>
        </div>
      ) : (
        <SalesTable
          uploads={uploads}
          onDelete={deleteAnalytics}
          onCogs={(analyticsId) => {
            router.push(routes.analytics.cogs(String(analyticsId)))
          }}
        />
      )}
    </div>
  )
}
