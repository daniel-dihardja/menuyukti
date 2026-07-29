/** Workflow chat session modes (general vs focused assistants). */

export const CHAT_MODE_IDS = ['general', 'story_image_assistant'] as const

export type ChatModeId = (typeof CHAT_MODE_IDS)[number]

export const DEFAULT_CHAT_MODE: ChatModeId = 'general'

const CHAT_MODE_SET = new Set<string>(CHAT_MODE_IDS)

export function isChatModeId(value: string): value is ChatModeId {
  return CHAT_MODE_SET.has(value)
}
