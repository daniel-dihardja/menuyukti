export type UserMessageCommandSegment =
  | { kind: 'text'; value: string }
  | { kind: 'slash'; value: string }
  | { kind: 'mention'; value: string }

function normalizeMentionTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim()
}

/** Longest title first so `@North Star Brief` matches before `@North`. */
function sortedMentionTitles(titles: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const t of titles) {
    const n = normalizeMentionTitle(t)
    if (n.length === 0 || seen.has(n)) {
      continue
    }
    seen.add(n)
    unique.push(n)
  }
  return unique.sort((a, b) => b.length - a.length)
}

function mentionSpanAt(text: string, atIndex: number, mentionTitles: string[]): number {
  const tail = text.slice(atIndex + 1)
  for (const title of sortedMentionTitles(mentionTitles)) {
    const head = tail.slice(0, title.length)
    if (head.localeCompare(title, undefined, { sensitivity: 'base' }) === 0) {
      const boundaryOk = tail.length === title.length || /\s/.test(tail.charAt(title.length) ?? '')
      if (boundaryOk) {
        return atIndex + 1 + title.length
      }
    }
  }
  return -1
}

function isBoundary(text: string, index: number): boolean {
  return index === 0 || /\s/.test(text.charAt(index - 1) ?? '')
}

const SLASH_TOKEN = /^\/[a-zA-Z][\w-]*/

/**
 * Split user-visible chat text into plain segments and `/…` / `@…` command spans for badge UI.
 * Slash tokens are recognized after start-of-string or whitespace. `@` mentions use optional
 * milestone titles for multi-word spans; otherwise a single `@word` chunk is used.
 */
export function segmentUserMessageForCommandBadges(
  text: string,
  options?: { mentionTitles?: string[] },
): UserMessageCommandSegment[] {
  const mentionTitles = options?.mentionTitles ?? []
  const segments: UserMessageCommandSegment[] = []
  let buf = ''
  let i = 0

  const flushText = () => {
    if (buf.length > 0) {
      segments.push({ kind: 'text', value: buf })
      buf = ''
    }
  }

  while (i < text.length) {
    if (isBoundary(text, i) && text.charAt(i) === '/') {
      const rest = text.slice(i)
      const m = rest.match(SLASH_TOKEN)
      if (m?.[0]) {
        flushText()
        segments.push({ kind: 'slash', value: m[0] })
        i += m[0].length
        continue
      }
    }

    if (isBoundary(text, i) && text.charAt(i) === '@') {
      const end = mentionSpanAt(text, i, mentionTitles)
      if (end > i) {
        flushText()
        segments.push({ kind: 'mention', value: text.slice(i, end) })
        i = end
        continue
      }
      const tail = text.slice(i + 1)
      const wordMatch = tail.match(/^[^\s@]+/)
      if (wordMatch?.[0]) {
        flushText()
        segments.push({ kind: 'mention', value: `@${wordMatch[0]}` })
        i += 1 + wordMatch[0].length
        continue
      }
    }

    buf += text.charAt(i)
    i += 1
  }

  flushText()
  return segments
}
