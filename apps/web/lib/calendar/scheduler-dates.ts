const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Parse a local calendar date from `YYYY-MM-DD` (no timezone shift). */
export function parseIsoDateOnly(value: string): Date | undefined {
  const trimmed = value.trim()
  if (!trimmed || !ISO_DATE_ONLY.test(trimmed)) {
    return undefined
  }

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
    return undefined
  }

  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}
