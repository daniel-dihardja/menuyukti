import {
  draftsMilestoneDataSchema,
  type DraftItem,
  type DraftsMilestoneData,
} from '@/lib/graphql/node-schemas'

const DRAFT_TITLE_MAX_LENGTH = 72

const EMPTY_DRAFTS_DATA: DraftsMilestoneData = { drafts: [] }

/** Default card title used before the preset was renamed to Drafts. */
export const LEGACY_IG_STORY_DRAFTS_TITLE = 'IG Story drafts'

/** Display title for milestones still carrying the old default name. */
export function normalizeDraftsMilestoneTitle(name: string): string {
  return name === LEGACY_IG_STORY_DRAFTS_TITLE ? 'Drafts' : name
}

/**
 * Coerce stored preset JSON into drafts shape.
 * Recovers from earlier Zod-union bugs and the legacy `stories` / `ig_story_drafts` payload.
 */
export function normalizeDraftsData(raw: unknown): DraftsMilestoneData {
  const parsed = draftsMilestoneDataSchema.safeParse(raw)
  if (parsed.success) {
    return parsed.data
  }
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const record = raw as { drafts?: unknown; stories?: unknown }
    const legacyItems = Array.isArray(record.drafts)
      ? record.drafts
      : Array.isArray(record.stories)
        ? record.stories
        : null
    if (legacyItems != null) {
      const recovered = draftsMilestoneDataSchema.safeParse({ drafts: legacyItems })
      if (recovered.success) {
        return recovered.data
      }
    }
  }
  return EMPTY_DRAFTS_DATA
}

function truncateDraftTitle(title: string): string {
  if (title.length <= DRAFT_TITLE_MAX_LENGTH) {
    return title
  }
  return `${title.slice(0, DRAFT_TITLE_MAX_LENGTH - 1).trimEnd()}…`
}

/**
 * Overview / detail title: prefer explicit `name`, else first markdown line, else untitled.
 */
export function draftListTitle(
  draft: Pick<DraftItem, 'name' | 'body'>,
  untitledLabel: string,
): string {
  const named = draft.name.trim()
  if (named) {
    return truncateDraftTitle(named)
  }
  const line =
    draft.body
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find((part) => part.length > 0) ?? ''
  if (!line) {
    return untitledLabel
  }
  const withoutHeading = line.replace(/^#{1,6}\s+/, '').trim()
  const title = withoutHeading || line
  return truncateDraftTitle(title)
}
