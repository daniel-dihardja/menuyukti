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
