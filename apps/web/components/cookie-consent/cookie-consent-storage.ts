/**
 * Persisted cookie/analytics preference. Bumping `STORAGE_VERSION` invalidates older payloads
 * and re-prompts the user on next load.
 */
export const STORAGE_KEY = 'menuyukti.cookie-consent'
export const STORAGE_VERSION = 1

export type StoredConsent = {
  version: number
  analytics: boolean
}

export type ConsentDecision = 'unknown' | 'accepted' | 'rejected'

/** Parse an arbitrary JSON string from storage; returns `null` for malformed or stale payloads. */
export function parseStoredConsent(raw: string | null): StoredConsent | null {
  if (raw == null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object') return null
  const candidate = parsed as Partial<StoredConsent>
  if (candidate.version !== STORAGE_VERSION) return null
  if (typeof candidate.analytics !== 'boolean') return null
  return { version: candidate.version, analytics: candidate.analytics }
}

export function decisionFromStored(stored: StoredConsent | null): ConsentDecision {
  if (!stored) return 'unknown'
  return stored.analytics ? 'accepted' : 'rejected'
}

export function serializeConsent(analytics: boolean): string {
  const payload: StoredConsent = { version: STORAGE_VERSION, analytics }
  return JSON.stringify(payload)
}

export function readConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  try {
    return parseStoredConsent(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeConsent(analytics: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeConsent(analytics))
  } catch {
    /* private mode / quota — best effort only */
  }
}
