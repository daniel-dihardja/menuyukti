const STORAGE_KEY = 'menuyukti:lastLocationId:v1'

function parsePositiveInt(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export function readLastLocationId(): number | null {
  if (typeof window === 'undefined') return null
  try {
    return parsePositiveInt(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeLastLocationId(id: number | null): void {
  if (typeof window === 'undefined') return
  try {
    if (id === null) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    if (!Number.isInteger(id) || id <= 0) return
    window.localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    /* ignore quota / private mode */
  }
}
