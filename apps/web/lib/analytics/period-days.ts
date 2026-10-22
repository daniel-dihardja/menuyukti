const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parse an ISO calendar date `YYYY-MM-DD` into a local Date at midnight.
 * Returns null when the string is not a valid calendar date.
 */
function parseIsoDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!ISO_DATE_ONLY.test(trimmed)) return null

  const [ys, ms, ds] = trimmed.split('-')
  const year = Number(ys)
  const month = Number(ms)
  const day = Number(ds)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

/**
 * Inclusive calendar-day count between two ISO dates (`YYYY-MM-DD`).
 * Same day → 1. Returns null when either date is missing/invalid or start > end.
 */
export function inclusiveCalendarDays(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
): number | null {
  const start = parseIsoDateOnly(periodStart)
  const end = parseIsoDateOnly(periodEnd)
  if (!start || !end) return null

  const msPerDay = 24 * 60 * 60 * 1000
  const diff = Math.round((end.getTime() - start.getTime()) / msPerDay)
  if (diff < 0) return null
  return diff + 1
}
