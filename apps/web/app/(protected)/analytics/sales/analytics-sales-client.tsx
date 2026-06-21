'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { LocationSelect } from './location-select'
import { SalesTable } from './sales-table'
import { useDeleteAnalytics } from './use-delete-analytics'
import UploadExcelClient from './upload-xcel-client'
import { useUploadAnalytics } from './use-upload-analytics'
import { routes } from '@/lib/routes'
import { useAnalytics } from '../use-analytics'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
  initialLocationId: number | null
  initialAnalytics: Array<{ id: number; name: string }>
}

export function AnalyticsSalesClient({ branches, initialLocationId, initialAnalytics }: Props) {
  const t = useTranslations('analytics.sales')
  const router = useRouter()

  const { locationId, setLocationId } = useAnalytics()

  useEffect(() => {
    if (initialLocationId !== null) {
      setLocationId(initialLocationId)
      return
    }
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (!onlyBranch) return
    setLocationId(onlyBranch.id)
  }, [initialLocationId, branches, setLocationId])

  useEffect(() => {
    if (locationId === null) return
    if (locationId === initialLocationId) return
    router.replace(routes.analytics.salesWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  const isNavigating = locationId !== null && locationId !== initialLocationId

  const { uploadFile, uploading, status, message, pos } = useUploadAnalytics(locationId, () =>
    router.refresh(),
  )
  const { deleteAnalytics, deleting } = useDeleteAnalytics({
    locationId,
    onSuccess: () => router.refresh(),
  })

  const uploads = initialAnalytics
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
        <UploadExcelClient
          disabled={!locationId}
          uploading={uploading}
          status={status}
          message={message}
          pos={pos}
          onFileSelected={uploadFile}
        />
      </section>

      {!locationId ? (
        <div className="border rounded-md p-8 text-left text-muted-foreground">
          {t('selectBranch')}
        </div>
      ) : isNavigating ? (
        <div className="border rounded-md p-8 text-left">{t('loading')}</div>
      ) : !hasUploads ? (
        <div className="border rounded-md p-8 text-left space-y-4">
          <h2 className="text-lg font-medium">{t('noAnalytics.title')}</h2>
          <p className="text-muted-foreground">{t('noAnalytics.description')}</p>
        </div>
      ) : (
        <SalesTable
          uploads={uploads}
          deleting={deleting}
          onDelete={deleteAnalytics}
          onCogs={(analyticsId) => {
            router.push(routes.analytics.cogs(String(analyticsId)))
          }}
        />
      )}
    </div>
  )
}
