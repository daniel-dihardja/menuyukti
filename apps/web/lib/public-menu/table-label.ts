/** Max length aligned with GraphQL `normalize_table_label` / `TABLE_LABEL_MAX_LEN`. */
export const PUBLIC_MENU_TABLE_LABEL_MAX_LEN = 64

/**
 * Decode and validate a public-menu table path segment.
 * Returns the cleaned label, or `null` if empty/invalid.
 *
 * Next.js route params are usually already decoded; we still attempt
 * `decodeURIComponent` for encoded segments, and fall back to the raw
 * string when decoding fails (e.g. a literal `%` in the label).
 */
export function parsePublicMenuTableLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null

  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }

  const cleaned = decoded.trim()
  if (!cleaned) return null
  if (cleaned.length > PUBLIC_MENU_TABLE_LABEL_MAX_LEN) return null
  // Reject C0/C1 controls and DEL — never valid in a table label.
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.charCodeAt(i)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return null
  }

  return cleaned
}
