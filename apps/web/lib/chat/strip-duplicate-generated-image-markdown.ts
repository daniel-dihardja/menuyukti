/**
 * Strip assistant-text duplicates of images already shown from
 * `generate_instagram_post_image` tool results (markdown / bare URL / HTML img).
 */

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?\s*\)/g
const HTML_IMG_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi

function normalizeUrlForCompare(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return url.trim()
  }
}

function urlMatchesAny(candidate: string, knownUrls: ReadonlySet<string>): boolean {
  const normalized = normalizeUrlForCompare(candidate)
  if (knownUrls.has(normalized) || knownUrls.has(candidate.trim())) {
    return true
  }
  for (const known of knownUrls) {
    if (known === candidate.trim() || known === normalized) {
      return true
    }
    // Presigned URLs often differ only by query; match on path when hosts align.
    try {
      const a = new URL(candidate)
      const b = new URL(known)
      if (a.origin === b.origin && a.pathname === b.pathname) {
        return true
      }
    } catch {
      /* ignore */
    }
  }
  return false
}

/**
 * Remove markdown images, HTML img tags, and bare URL lines that duplicate
 * known generated-image URLs already rendered from tool parts.
 */
export function stripDuplicateGeneratedImageMarkdown(
  text: string,
  imageUrls: readonly string[],
): string {
  if (!text || imageUrls.length === 0) {
    return text
  }

  const known = new Set(imageUrls.map((u) => normalizeUrlForCompare(u)).filter(Boolean))
  if (known.size === 0) {
    return text
  }

  let next = text.replace(MARKDOWN_IMAGE_RE, (full, url: string) =>
    urlMatchesAny(url, known) ? '' : full,
  )
  next = next.replace(HTML_IMG_RE, (full, url: string) => (urlMatchesAny(url, known) ? '' : full))

  // Drop lines that are only a known image URL (common model habit).
  next = next
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true
      if (urlMatchesAny(trimmed, known)) return false
      // Angle-bracket autolink form
      const angle = trimmed.match(/^<(https?:\/\/[^>]+)>$/)
      const angleUrl = angle?.[1]
      if (angleUrl && urlMatchesAny(angleUrl, known)) return false
      return true
    })
    .join('\n')

  // Collapse excess blank lines left by removals.
  return next.replace(/\n{3,}/g, '\n\n').trim()
}

/** Parse `url` from generate_instagram_post_image tool output JSON (or stringified JSON). */
export function parseGeneratedImageUrlFromToolOutput(output: unknown): string | null {
  const raw = typeof output === 'string' ? output : output != null ? JSON.stringify(output) : ''
  if (!raw || raw.startsWith('Error')) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('url' in parsed)) {
      return null
    }
    const url = (parsed as { url?: unknown }).url
    return typeof url === 'string' && url ? url : null
  } catch {
    return null
  }
}
