import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  parseGeneratedImageToolResult,
  type GeneratedImageToolResult,
} from '@/lib/chat/parse-generated-image-tool-output'
import { mediaTypeFromFilename } from '@/lib/chat/workflow-chat-media-mention'

/** Stable pending-attachment id for the auto-attached latest generated image. */
export const AUTO_ATTACHED_GENERATED_ID = 'workflow-chat-auto-attached-generated'

export const AUTO_ATTACH_GENERATED_STORAGE_KEY = 'menuyukti.wfChat.autoAttachGenerated.v1'

export type PendingMediaAttachmentKind = 'photo' | 'post'

export type PendingMediaAttachment = {
  id: string
  kind: PendingMediaAttachmentKind
  name: string
  url: string
  mediaType: string
}

function resolveToolName(part: { type: string; toolName?: string }): string {
  if (part.type === 'dynamic-tool' && typeof part.toolName === 'string') {
    return part.toolName
  }
  return part.type.split('-').slice(1).join('-')
}

/** Upsert the stable auto-attached generated-image chip (post previous-result). */
export function upsertAutoAttachedGeneratedImage(
  prev: PendingMediaAttachment[],
  image: Pick<GeneratedImageToolResult, 'name' | 'url'>,
): PendingMediaAttachment[] {
  const nextAttachment: PendingMediaAttachment = {
    id: AUTO_ATTACHED_GENERATED_ID,
    kind: 'post',
    name: image.name,
    url: image.url,
    mediaType: mediaTypeFromFilename(image.name),
  }

  const existingIdx = prev.findIndex((m) => m.id === AUTO_ATTACHED_GENERATED_ID)
  if (existingIdx >= 0) {
    const next = [...prev]
    next[existingIdx] = nextAttachment
    return next
  }

  if (prev.length >= CHAT_MAX_IMAGES) {
    return prev
  }

  return [...prev, nextAttachment]
}

/**
 * Walk messages newest-last and return the latest successful generate_instagram_post_image result.
 */
export function findLatestGeneratedImageFromMessages(
  messages: readonly UIMessage[],
): GeneratedImageToolResult | null {
  let latest: GeneratedImageToolResult | null = null
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.parts) continue
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue
      const toolName = resolveToolName(part)
      if (toolName !== 'generate_instagram_post_image') continue
      if (part.state !== 'output-available') continue
      if (!('output' in part) || part.output == null) continue
      const parsed = parseGeneratedImageToolResult(part.output)
      if (parsed) latest = parsed
    }
  }
  return latest
}

/** Collect new successful generate tool results not yet seen (by toolCallId). */
export function collectNewGeneratedImageToolResults(
  messages: readonly UIMessage[],
  seenToolCallIds: ReadonlySet<string>,
): Array<{ toolCallId: string; image: GeneratedImageToolResult }> {
  const found: Array<{ toolCallId: string; image: GeneratedImageToolResult }> = []
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.parts) continue
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue
      const toolName = resolveToolName(part)
      if (toolName !== 'generate_instagram_post_image') continue
      if (part.state !== 'output-available') continue
      const toolCallId = 'toolCallId' in part ? String(part.toolCallId) : null
      if (!toolCallId || seenToolCallIds.has(toolCallId)) continue
      if (!('output' in part) || part.output == null) continue
      const parsed = parseGeneratedImageToolResult(part.output)
      if (!parsed) continue
      found.push({ toolCallId, image: parsed })
    }
  }
  return found
}

export function readAutoAttachGeneratedPreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(AUTO_ATTACH_GENERATED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeAutoAttachGeneratedPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUTO_ATTACH_GENERATED_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}
