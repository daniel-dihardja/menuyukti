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
  /** Guest URL slug (`/{slug}`); empty means unset. */
  publicSlug: string
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

export function openingHoursAreAllClosed(rows: OpeningHourRow[]): boolean {
  return rows.every((row) => row.closed || !row.openTime || !row.closeTime)
}

export type OpeningHoursSummaryKind = 'closedAll' | 'weekdays' | 'everyDay' | 'custom'

export function classifyOpeningHoursSummary(rows: OpeningHourRow[]): {
  kind: OpeningHoursSummaryKind
  openTime?: string
  closeTime?: string
} {
  if (openingHoursAreAllClosed(rows)) {
    return { kind: 'closedAll' }
  }

  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]))
  const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  const weekend: Weekday[] = ['saturday', 'sunday']

  const weekdayRows = weekdays.map((day) => byDay.get(day)).filter(Boolean) as OpeningHourRow[]
  const weekendRows = weekend.map((day) => byDay.get(day)).filter(Boolean) as OpeningHourRow[]

  const sameSlot = (a: OpeningHourRow, b: OpeningHourRow) =>
    a.closed === b.closed && a.openTime === b.openTime && a.closeTime === b.closeTime

  const weekdaysUniform =
    weekdayRows.length === 5 &&
    weekdayRows.every((row) => !row.closed && row.openTime && row.closeTime) &&
    weekdayRows.every((row) => sameSlot(row, weekdayRows[0]!))

  const weekendClosed = weekendRows.every((row) => row.closed || !row.openTime || !row.closeTime)

  if (weekdaysUniform && weekendClosed) {
    return {
      kind: 'weekdays',
      openTime: weekdayRows[0]!.openTime,
      closeTime: weekdayRows[0]!.closeTime,
    }
  }

  const openRows = rows.filter((row) => !row.closed && row.openTime && row.closeTime)
  if (openRows.length === 7 && openRows.every((row) => sameSlot(row, openRows[0]!))) {
    return {
      kind: 'everyDay',
      openTime: openRows[0]!.openTime,
      closeTime: openRows[0]!.closeTime,
    }
  }

  return { kind: 'custom' }
}
