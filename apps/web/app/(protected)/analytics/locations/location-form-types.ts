export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type OpeningHourRow = {
  dayOfWeek: Weekday
  closed: boolean
  openTime: string
  closeTime: string
}

export type LocationFormValues = {
  name: string
  street: string
  city: string
  countryId?: string
  country: string
  currency: string
  openingHours: OpeningHourRow[]
}

export const LOCATION_WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const LOCATION_DEFAULT_OPEN = '09:00'
export const LOCATION_DEFAULT_CLOSE = '22:00'

export function defaultLocationOpeningHours(): OpeningHourRow[] {
  return LOCATION_WEEKDAYS.map((day) => ({
    dayOfWeek: day,
    closed: true,
    openTime: '',
    closeTime: '',
  }))
}
