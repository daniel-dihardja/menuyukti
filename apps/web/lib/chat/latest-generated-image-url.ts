import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

import { parseGeneratedImageUrlFromToolOutput } from '@/lib/chat/strip-duplicate-generated-image-markdown'

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

/**
 * Latest successful `generate_instagram_post_image` image URL across chat messages
 * (walk order; last win). Used by the Story assistant preview panel.
 */
export function latestGeneratedImageUrlFromMessages(messages: readonly UIMessage[]): string | null {
  let latest: string | null = null
  for (const message of messages) {
    const parts = message.parts
    if (!parts?.length) continue
    for (const part of parts) {
      if (!isToolUIPart(part)) continue
      if (resolveToolName(part) !== GENERATE_INSTAGRAM_POST_IMAGE_TOOL) continue
      if (!('output' in part) || part.output == null) continue
      const url = parseGeneratedImageUrlFromToolOutput(part.output)
      if (url) {
        latest = url
      }
    }
  }
  return latest
}
