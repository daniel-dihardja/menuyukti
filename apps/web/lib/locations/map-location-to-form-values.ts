import type {
  LocationFormValues,
  Weekday,
} from '@/app/(protected)/analytics/locations/location-form-types'

const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export type LocationDetailPayload = {
  id: string
  name: string
  publicSlug: string | null
  street: string | null
  city: string | null
  country: string | null
  currency: string | null
  openingHours: Array<{
    dayOfWeek: string
    openTime: string
    closeTime: string
  }>
  manualBriefInput: {
    locationId: number
    quickProfile: Record<string, unknown>
  } | null
}

export function mapLocationToFormValues(location: LocationDetailPayload): {
  initialValues: LocationFormValues
  initialManualQuickProfile: Record<string, unknown> | null
} {
  const openingHoursByDay = new Map(
    location.openingHours.map((entry) => [
      entry.dayOfWeek,
      { open: entry.openTime, close: entry.closeTime },
    ]),
  )

  return {
    initialValues: {
      name: location.name,
      street: location.street ?? '',
      city: location.city ?? '',
      country: location.country ?? '',
      currency: location.currency ?? '',
      publicSlug: location.publicSlug ?? '',
      openingHours: WEEKDAYS.map((day) => {
        const slot = openingHoursByDay.get(day)
        const hasSlot = Boolean(slot?.open && slot?.close)
        return {
          dayOfWeek: day,
          closed: !hasSlot,
          openTime: hasSlot ? (slot?.open ?? '') : '',
          closeTime: hasSlot ? (slot?.close ?? '') : '',
        }
      }),
    },
    initialManualQuickProfile: location.manualBriefInput?.quickProfile ?? null,
  }
}
