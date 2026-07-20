/**
 * Workflow-scoped human-friendly milestone display codes (`M-XXXX`).
 * System bindings continue to use GraphQL node ids.
 */

export const MILESTONE_DISPLAY_CODE_PREFIX = 'M-' as const

/** Crockford-style alphabet without ambiguous I, L, O, U. */
export const MILESTONE_DISPLAY_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' as const

const SUFFIX_LENGTH = 4
const MAX_GENERATE_ATTEMPTS = 64

export const MILESTONE_DISPLAY_CODE_REGEX = /^M-[0-9A-HJKMNP-TV-Z]{4}$/

export function parseMilestoneDisplayCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined
  }
  const trimmed = raw.trim().toUpperCase()
  if (!MILESTONE_DISPLAY_CODE_REGEX.test(trimmed)) {
    return undefined
  }
  return trimmed
}

function randomSuffix(): string {
  const alphabet = MILESTONE_DISPLAY_CODE_ALPHABET
  let out = ''
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length)
    out += alphabet[idx] ?? '0'
  }
  return out
}

/**
 * Generate a unique `M-XXXX` code not present in `existing` (normalized uppercase).
 */
export function generateMilestoneDisplayCode(existing: ReadonlySet<string>): string {
  const taken = new Set<string>()
  for (const code of existing) {
    const parsed = parseMilestoneDisplayCode(code)
    if (parsed) {
      taken.add(parsed)
    }
  }

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const candidate = `${MILESTONE_DISPLAY_CODE_PREFIX}${randomSuffix()}`
    if (!taken.has(candidate)) {
      return candidate
    }
  }

  throw new Error('Failed to generate a unique milestone display code')
}

/** Collect valid display codes from milestone node `data` objects or timeline rows. */
export function collectExistingDisplayCodes(
  rows: ReadonlyArray<{ data?: unknown; displayCode?: unknown }>,
): Set<string> {
  const codes = new Set<string>()
  for (const row of rows) {
    const fromField = parseMilestoneDisplayCode(row.displayCode)
    if (fromField) {
      codes.add(fromField)
      continue
    }
    if (row.data != null && typeof row.data === 'object' && !Array.isArray(row.data)) {
      const fromData = parseMilestoneDisplayCode(
        (row.data as { displayCode?: unknown }).displayCode,
      )
      if (fromData) {
        codes.add(fromData)
      }
    }
  }
  return codes
}
