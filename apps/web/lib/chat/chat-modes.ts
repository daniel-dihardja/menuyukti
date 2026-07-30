/** Chat session modes (general vs focused image assistant). */

export const CHAT_MODE_IDS = ['general', 'image_assistant'] as const

export type ChatModeId = (typeof CHAT_MODE_IDS)[number]

export const DEFAULT_CHAT_MODE: ChatModeId = 'general'

/** Legacy wire ID — map to `image_assistant` on read. */
export const LEGACY_STORY_IMAGE_ASSISTANT_MODE = 'story_image_assistant'

const CHAT_MODE_SET = new Set<string>(CHAT_MODE_IDS)

export function isChatModeId(value: string): value is ChatModeId {
  return CHAT_MODE_SET.has(value)
}

/** Normalize stored or inbound mode IDs (including the legacy story alias). */
export function normalizeChatModeId(value: string): ChatModeId | null {
  if (value === LEGACY_STORY_IMAGE_ASSISTANT_MODE) {
    return 'image_assistant'
  }
  return isChatModeId(value) ? value : null
}
