/** Minimum stored explanation length worth showing in the scheduler preview. */
export const SCHEDULE_EXPLANATION_MIN_DISPLAY_CHARS = 80

/** At or below this length, show the full text without a collapse control. */
export const SCHEDULE_EXPLANATION_INLINE_MAX_CHARS = 200

const PREVIEW_SNIPPET_MAX_CHARS = 96

export function normalizeScheduleExplanation(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function shouldShowScheduleExplanation(text: string): boolean {
  return normalizeScheduleExplanation(text).length >= SCHEDULE_EXPLANATION_MIN_DISPLAY_CHARS
}

export function scheduleExplanationUsesDisclosure(text: string): boolean {
  return normalizeScheduleExplanation(text).length > SCHEDULE_EXPLANATION_INLINE_MAX_CHARS
}

/** One-line teaser when the disclosure is collapsed; null when the full text is short enough to skip. */
export function scheduleExplanationPreviewSnippet(text: string): string | null {
  const normalized = normalizeScheduleExplanation(text)
  if (normalized.length <= PREVIEW_SNIPPET_MAX_CHARS) {
    return null
  }
  const cut = normalized.slice(0, PREVIEW_SNIPPET_MAX_CHARS)
  const lastSpace = cut.lastIndexOf(' ')
  const snippet = (lastSpace > 48 ? cut.slice(0, lastSpace) : cut).trim()
  return `${snippet}…`
}
