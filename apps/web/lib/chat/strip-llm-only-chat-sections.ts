/**
 * Strip BFF-injected LLM-only markdown sections from checkpoint / history user text
 * so the chat UI shows what the user typed (plus optional attachment filenames).
 */

import { ATTACHED_MEDIA_LIBRARY_SECTION_HEADING } from '@/lib/chat/format-attached-media-for-chat'

/** Headings prepended by the chat BFF for the model only (not user-authored). */
export const LLM_ONLY_CHAT_SECTION_PREFIXES = [
  ATTACHED_MEDIA_LIBRARY_SECTION_HEADING,
  '## Preset data —',
  '## Visualization data —',
] as const

const ATTACHED_FILENAME_LINE_RE = /^\d+\.\s+(\S.+)$/

function isLlmOnlySection(chunk: string): boolean {
  const trimmed = chunk.trimStart()
  return LLM_ONLY_CHAT_SECTION_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

function extractAttachedMediaNames(chunk: string): string[] {
  if (!chunk.trimStart().startsWith(ATTACHED_MEDIA_LIBRARY_SECTION_HEADING)) {
    return []
  }
  const names: string[] = []
  for (const line of chunk.split('\n')) {
    const match = line.match(ATTACHED_FILENAME_LINE_RE)
    if (match?.[1]) {
      names.push(match[1].trim())
    }
  }
  return names
}

export type StrippedLlmOnlyChatSections = {
  /** Remaining user-visible text after removing LLM-only sections. */
  text: string
  /** Filenames listed in a stripped attached-media section (if any). */
  attachedMediaNames: string[]
}

/**
 * Split on blank lines (same join used when building the agents user message),
 * drop known LLM-only sections, keep user text.
 */
export function stripLlmOnlyChatSections(text: string): StrippedLlmOnlyChatSections {
  const raw = text ?? ''
  if (!raw.trim()) {
    return { text: '', attachedMediaNames: [] }
  }

  const chunks = raw.split(/\n\n+/)
  const kept: string[] = []
  const attachedMediaNames: string[] = []

  for (const chunk of chunks) {
    if (isLlmOnlySection(chunk)) {
      for (const name of extractAttachedMediaNames(chunk)) {
        if (!attachedMediaNames.includes(name)) {
          attachedMediaNames.push(name)
        }
      }
      continue
    }
    kept.push(chunk)
  }

  return {
    text: kept.join('\n\n').trim(),
    attachedMediaNames,
  }
}
