import { formatMediaMentionLabel } from '@/lib/chat/workflow-chat-media-mention'

const MENTION_AT_END = /(?:^|\s)@([^\s@]*)$/

export function parseMentionAtEnd(
  value: string,
): { filterQuery: string; mentionStart: number } | null {
  const match = MENTION_AT_END.exec(value)
  if (!match) return null
  const mentionStart = match.index! + (match[0].startsWith(' ') ? 1 : 0)
  return { filterQuery: match[1]!.toLowerCase(), mentionStart }
}

/** Clear a trailing `@` mention trigger without inserting a label. */
export function clearTrailingMentionTrigger(value: string): string {
  const parsed = parseMentionAtEnd(value)
  if (!parsed) return value
  return value.slice(0, parsed.mentionStart).trimEnd()
}

/** Whether a preview or media row matches the typed `@` filter query. */
export function matchesMentionFilter(filterQuery: string, name: string, label?: string): boolean {
  if (filterQuery.length === 0) return true
  const q = filterQuery.toLowerCase()
  if (name.toLowerCase().includes(q)) return true
  if (label?.toLowerCase().includes(q)) return true
  return formatMediaMentionLabel(name).toLowerCase().includes(q)
}

/** Filter media catalog items for the chat `@` mention menu. */
export function filterMediaForMention<T extends { name: string }>(
  items: T[],
  filterQuery: string,
  excludeNames?: ReadonlySet<string>,
): T[] {
  return items.filter((item) => {
    if (excludeNames?.has(item.name)) return false
    return matchesMentionFilter(filterQuery, item.name)
  })
}
