/**
 * Strip assistant-text duplicates of images already shown from
 * `generate_instagram_post_image` tool results (markdown / bare URL / HTML img).
 */

import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

import { parseGeneratedImageToolResult } from '@/lib/chat/parse-generated-image-tool-output'

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?\s*\)/g
const HTML_IMG_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
const GENERATE_INSTAGRAM_POST_IMAGE_TOOL = 'generate_instagram_post_image'

function resolveToolName(part: { type: string; toolName?: string }): string {
  if (part.type === 'dynamic-tool' && typeof part.toolName === 'string') {
    return part.toolName
  }
  if (part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length)
  }
  return ''
}

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

/** Parse `url` from generate_instagram_post_image tool output JSON (or stringified JSON). */
export function parseGeneratedImageUrlFromToolOutput(output: unknown): string | null {
  const full = parseGeneratedImageToolResult(output)
  if (full) {
    return full.url
  }
  // URL-only payloads (legacy / display): accept url without name/mediaS3Key.
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

export function collectGeneratedImageUrlsFromParts(
  parts: UIMessage['parts'] | undefined,
): string[] {
  if (!parts?.length) return []
  const urls: string[] = []
  for (const part of parts) {
    if (!isToolUIPart(part)) continue
    if (resolveToolName(part) !== GENERATE_INSTAGRAM_POST_IMAGE_TOOL) continue
    if (!('output' in part) || part.output == null) continue
    const url = parseGeneratedImageUrlFromToolOutput(part.output)
    if (url) urls.push(url)
  }
  return urls
}

/** All successful generate_instagram_post_image URLs across the thread (order preserved). */
export function collectGeneratedImageUrlsFromMessages(
  messages: readonly UIMessage[] | undefined,
): string[] {
  if (!messages?.length) return []
  const urls: string[] = []
  const seen = new Set<string>()
  for (const message of messages) {
    for (const url of collectGeneratedImageUrlsFromParts(message.parts)) {
      const key = normalizeUrlForCompare(url)
      if (seen.has(key)) continue
      seen.add(key)
      urls.push(url)
    }
  }
  return urls
}

export function messageHasSuccessfulGenerateImageTool(message: UIMessage): boolean {
  return collectGeneratedImageUrlsFromParts(message.parts).length > 0
}

export type StripDuplicateGeneratedImageOptions = {
  /**
   * When true (message already rendered the tool thumbnail), remove every markdown /
   * HTML image embed from assistant text — not only URL matches.
   */
  stripAllImageEmbeds?: boolean
}

/**
 * Remove markdown images, HTML img tags, and bare URL lines that duplicate
 * known generated-image URLs already rendered from tool parts.
 */
export function stripDuplicateGeneratedImageMarkdown(
  text: string,
  imageUrls: readonly string[],
  options?: StripDuplicateGeneratedImageOptions,
): string {
  if (!text) {
    return text
  }

  const stripAll = Boolean(options?.stripAllImageEmbeds)
  const known = new Set(imageUrls.map((u) => normalizeUrlForCompare(u)).filter(Boolean))
  if (!stripAll && known.size === 0) {
    return text
  }

  let next = text.replace(MARKDOWN_IMAGE_RE, (full, url: string) =>
    stripAll || urlMatchesAny(url, known) ? '' : full,
  )
  next = next.replace(HTML_IMG_RE, (full, url: string) =>
    stripAll || urlMatchesAny(url, known) ? '' : full,
  )

  // Drop lines that are only a known image URL (common model habit).
  next = next
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true
      if (known.size > 0 && urlMatchesAny(trimmed, known)) return false
      // Angle-bracket autolink form
      const angle = trimmed.match(/^<(https?:\/\/[^>]+)>$/)
      const angleUrl = angle?.[1]
      if (angleUrl && known.size > 0 && urlMatchesAny(angleUrl, known)) return false
      return true
    })
    .join('\n')

  // Collapse excess blank lines left by removals.
  return next.replace(/\n{3,}/g, '\n\n').trim()
}
