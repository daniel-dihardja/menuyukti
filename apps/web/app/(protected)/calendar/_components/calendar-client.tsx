'use client'

import { useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import type { CalendarDisplaySlot } from '@/lib/graphql/queries/scheduler-calendar'
import type { CampaignWindowPublicHoliday } from '@/lib/calendar/types'
import { routes } from '@/lib/routes'

import { WorkspaceCalendar } from './workspace-calendar'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
  initialLocationId: number | null
  slots?: CalendarDisplaySlot[]
  publicHolidays?: CampaignWindowPublicHoliday[]
}

export function CalendarClient({
  branches,
  initialLocationId,
  slots = [],
  publicHolidays = [],
}: Props) {
  const t = useTranslations('platform.calendar')
  const locale = useLocale()
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
    router.replace(routes.calendarWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  const activeLocationId = locationId ?? initialLocationId

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

      <WorkspaceCalendar
        className="min-h-[28rem] flex-1"
        locale={locale}
        locationId={activeLocationId}
        slots={slots}
        publicHolidays={publicHolidays}
      />
    </div>
  )
}
