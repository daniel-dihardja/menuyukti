'use client'

import { useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import { routes } from '@/lib/routes'

import { WorkspaceCalendar } from './workspace-calendar'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
  initialLocationId: number | null
}

export function CalendarClient({ branches, initialLocationId }: Props) {
  const t = useTranslations('platform.calendar')
  const locale = useLocale()
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
    router.replace(routes.calendarWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {branches.length > 0 ? (
        <LocationSelect
          branches={branches}
          id="calendar-location-select"
          label={t('branchLabel')}
          placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
          description={t('branchDescription')}
          className="w-full max-w-none sm:max-w-xs"
        />
      ) : null}

      <WorkspaceCalendar className="min-h-[28rem] flex-1" locale={locale} />
    </div>
  )
}
