import type { UIMessage } from 'ai'

import { mediaTypeFromFilename } from '@/lib/chat/chat-media-mention'

export const ATTACHED_MEDIA_PRESIGN_MAX = 32

/** Legacy history text: `Attached: a.png, b.png` (one or more lines). */
const LEGACY_ATTACHED_LINE_RE = /^Attached:\s*(.+)$/gm

function parseLegacyAttachedNames(text: string): string[] {
  const names: string[] = []
  for (const match of text.matchAll(LEGACY_ATTACHED_LINE_RE)) {
    const raw = match[1]?.trim()
    if (!raw) continue
    for (const part of raw.split(',')) {
      const name = part.trim()
      if (name && !names.includes(name)) {
        names.push(name)
      }
    }
  }
  return names
}

function stripLegacyAttachedLines(text: string): string {
  return text
    .replace(LEGACY_ATTACHED_LINE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type FilePart = Extract<UIMessage['parts'][number], { type: 'file' }>

function isFilePart(part: UIMessage['parts'][number]): part is FilePart {
  return part.type === 'file'
}

function attachedNamesFromUserMessage(message: UIMessage): string[] {
  if (message.role !== 'user') return []
  const names: string[] = []
  const parts = message.parts
  if (!parts?.length) return names

  for (const part of parts) {
    if (isFilePart(part) && typeof part.filename === 'string' && part.filename.trim()) {
      const name = part.filename.trim()
      if (!names.includes(name)) names.push(name)
      continue
    }
    if (part.type === 'text' && typeof part.text === 'string') {
      for (const name of parseLegacyAttachedNames(part.text)) {
        if (!names.includes(name)) names.push(name)
      }
    }
  }
  return names
}

/** Unique photo filenames from user file parts and legacy `Attached:` text. */
export function collectAttachedPhotoFilenames(messages: readonly UIMessage[]): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const message of messages) {
    for (const name of attachedNamesFromUserMessage(message)) {
      if (seen.has(name)) continue
      seen.add(name)
      names.push(name)
    }
  }
  return names
}

/**
 * Ensure user messages have `file` parts for attached photo names, set `url` from
 * the map when present, and strip legacy `Attached:` text lines.
 */
export function hydrateAttachedMediaInMessages(
  messages: UIMessage[],
  urlByName: Readonly<Record<string, string>>,
): UIMessage[] {
  let anyChanged = false
  const nextMessages = messages.map((message) => {
    if (message.role !== 'user') return message
    const attachedNames = attachedNamesFromUserMessage(message)
    const parts = message.parts ?? []
    if (parts.length === 0 && attachedNames.length === 0) return message

    const existingNames = new Set<string>()
    for (const part of parts) {
      if (!isFilePart(part)) continue
      const name = typeof part.filename === 'string' ? part.filename.trim() : ''
      if (name) existingNames.add(name)
    }

    let changed = false
    const nextParts: UIMessage['parts'] = []

    for (const part of parts) {
      if (part.type === 'text' && typeof part.text === 'string') {
        const stripped = stripLegacyAttachedLines(part.text)
        if (stripped !== part.text) changed = true
        if (stripped) {
          nextParts.push(stripped === part.text ? part : { ...part, text: stripped })
        }
        continue
      }
      if (isFilePart(part)) {
        const name = typeof part.filename === 'string' ? part.filename.trim() : ''
        const freshUrl = name ? urlByName[name] : undefined
        if (typeof freshUrl === 'string' && freshUrl && freshUrl !== part.url) {
          changed = true
          nextParts.push({
            ...part,
            filename: name || part.filename,
            mediaType: part.mediaType || mediaTypeFromFilename(name),
            url: freshUrl,
          })
        } else {
          nextParts.push(part)
        }
        continue
      }
      nextParts.push(part)
    }

    for (const name of attachedNames) {
      if (existingNames.has(name)) continue
      changed = true
      const freshUrl = urlByName[name]
      nextParts.push({
        type: 'file',
        filename: name,
        mediaType: mediaTypeFromFilename(name),
        url: typeof freshUrl === 'string' && freshUrl ? freshUrl : '',
      })
    }

    if (!changed) return message
    anyChanged = true
    return { ...message, parts: nextParts }
  })
  return anyChanged ? nextMessages : messages
}
