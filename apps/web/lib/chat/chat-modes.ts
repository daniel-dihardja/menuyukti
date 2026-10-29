/** Chat session modes (general vs focused assistants). */

import { isFeatureEnabled } from '@/lib/feature-flags'

/** Catalog of advisor composer modes (visibility gated by feature flags). */
export const ADVISOR_CHAT_MODE_IDS = ['general', 'image_assistant'] as const

/** All modes accepted by `/api/chat` when their feature flags allow (includes inventar-only surface). */
export const CHAT_MODE_IDS = [...ADVISOR_CHAT_MODE_IDS, 'inventar'] as const

export type ChatModeId = (typeof CHAT_MODE_IDS)[number]
export type AdvisorChatModeId = (typeof ADVISOR_CHAT_MODE_IDS)[number]

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

/** Whether Image Assistant (and legacy story alias) may be selected / accepted. */
export function isChatImageAssistantEnabled(): boolean {
  return isFeatureEnabled('chatImageAssistant')
}

/** Advisor picker modes that are enabled for this build. */
export function getEnabledAdvisorChatModeIds(): AdvisorChatModeId[] {
  return ADVISOR_CHAT_MODE_IDS.filter((id) => {
    if (id === 'image_assistant') return isChatImageAssistantEnabled()
    return true
  })
}

/**
 * Whether a chat mode may be used for this build.
 * `inventar` stays available for the inventar surface (gated by that route's flag).
 */
export function isChatModeEnabled(mode: ChatModeId): boolean {
  if (mode === 'image_assistant') return isChatImageAssistantEnabled()
  return true
}

/** Map inbound/stored mode to an enabled mode (falls back to general). */
export function coerceEnabledChatMode(mode: ChatModeId | null | undefined): ChatModeId {
  if (mode == null) return DEFAULT_CHAT_MODE
  return isChatModeEnabled(mode) ? mode : DEFAULT_CHAT_MODE
}
