import { isToolUIPart, type UIMessage } from 'ai'

import { parseGeneratedImageToolResult } from '@/lib/chat/parse-generated-image-tool-output'

export const GENERATE_INSTAGRAM_POST_IMAGE_TOOL = 'generate_instagram_post_image'

function resolveToolName(part: { type: string; toolName?: string }): string {
  if (part.type === 'dynamic-tool' && typeof part.toolName === 'string') {
    return part.toolName
  }
  if (part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length)
  }
  return ''
}

function parseOutputRecord(output: unknown): Record<string, unknown> | null {
  let raw: unknown = output
  if (typeof output === 'string') {
    try {
      raw = JSON.parse(output)
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== 'object') return null
  return raw as Record<string, unknown>
}

function rewriteToolOutput(
  output: unknown,
  updater: (record: Record<string, unknown>) => Record<string, unknown> | null,
): unknown {
  const record = parseOutputRecord(output)
  if (!record) return output
  const next = updater(record)
  if (!next) return output
  if (typeof output === 'string') {
    return JSON.stringify(next)
  }
  return next
}

function mapGenerateToolParts(
  messages: UIMessage[],
  mapPart: (part: UIMessage['parts'][number]) => UIMessage['parts'][number],
): UIMessage[] {
  return messages.map((message) => {
    const parts = message.parts
    if (!parts?.length) return message
    let changed = false
    const nextParts = parts.map((part) => {
      if (!isToolUIPart(part)) return part
      if (resolveToolName(part) !== GENERATE_INSTAGRAM_POST_IMAGE_TOOL) return part
      const mapped = mapPart(part)
      if (mapped !== part) changed = true
      return mapped
    })
    if (!changed) return message
    return { ...message, parts: nextParts }
  })
}

/**
 * Ensure successful generate tool outputs always include url, name, and mediaS3Key
 * (preserve extra fields such as story_assets / action).
 */
export function normalizeGeneratedImageToolOutputsInMessages(messages: UIMessage[]): UIMessage[] {
  return mapGenerateToolParts(messages, (part) => {
    if (!('output' in part) || part.output == null) return part
    const parsed = parseGeneratedImageToolResult(part.output)
    if (!parsed) return part
    const nextOutput = rewriteToolOutput(part.output, (record) => ({
      ...record,
      url: parsed.url,
      name: parsed.name,
      mediaS3Key: parsed.mediaS3Key,
    }))
    if (nextOutput === part.output) return part
    return { ...part, output: nextOutput }
  })
}

/** Unique mediaS3Key values from successful generate_instagram_post_image tool outputs. */
export function collectGeneratedImageMediaS3Keys(messages: readonly UIMessage[]): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const message of messages) {
    const parts = message.parts
    if (!parts?.length) continue
    for (const part of parts) {
      if (!isToolUIPart(part)) continue
      if (resolveToolName(part) !== GENERATE_INSTAGRAM_POST_IMAGE_TOOL) continue
      if (!('output' in part) || part.output == null) continue
      const parsed = parseGeneratedImageToolResult(part.output)
      if (!parsed) continue
      if (seen.has(parsed.mediaS3Key)) continue
      seen.add(parsed.mediaS3Key)
      keys.push(parsed.mediaS3Key)
    }
  }
  return keys
}

/**
 * Rewrite generate tool output `url` fields using a mediaS3Key → fresh presigned URL map.
 * Unknown keys are left unchanged.
 */
export function applyPresignedUrlsToMessages(
  messages: UIMessage[],
  urlByKey: Readonly<Record<string, string>>,
): UIMessage[] {
  if (Object.keys(urlByKey).length === 0) return messages
  return mapGenerateToolParts(messages, (part) => {
    if (!('output' in part) || part.output == null) return part
    const parsed = parseGeneratedImageToolResult(part.output)
    if (!parsed) return part
    const freshUrl = urlByKey[parsed.mediaS3Key]
    if (typeof freshUrl !== 'string' || !freshUrl || freshUrl === parsed.url) return part
    const nextOutput = rewriteToolOutput(part.output, (record) => ({
      ...record,
      url: freshUrl,
      name: parsed.name,
      mediaS3Key: parsed.mediaS3Key,
    }))
    if (nextOutput === part.output) return part
    return { ...part, output: nextOutput }
  })
}
