const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Display milestone preview dates as `<Weekday>. DD.MM.YYYY` (weekday follows active locale).
 * Expects ISO calendar dates `YYYY-MM-DD`; other strings are returned unchanged.
 */
export function formatPreviewDateString(value: string, locale: string): string {
  const trimmed = value.trim()
  if (!trimmed || !ISO_DATE_ONLY.test(trimmed)) {
    return value
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
    return value
  }

  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return value
  }

  const weekdayRaw = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
  const weekday = weekdayRaw.replace(/\.+$/, '').trim()
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const yyyy = String(year)

  return `${weekday}. ${dd}.${mm}.${yyyy}`
}
