import { describe, expect, it } from 'vitest'

import {
  coerceEnabledChatMode,
  DEFAULT_CHAT_MODE,
  getEnabledAdvisorChatModeIds,
  isChatImageAssistantEnabled,
  isChatModeEnabled,
  isChatModeId,
  LEGACY_STORY_IMAGE_ASSISTANT_MODE,
  normalizeChatModeId,
} from '@/lib/chat/chat-modes'

describe('chat-modes', () => {
  it('accepts canonical mode ids', () => {
    expect(isChatModeId('general')).toBe(true)
    expect(isChatModeId('image_assistant')).toBe(true)
    expect(isChatModeId('inventar')).toBe(true)
    expect(isChatModeId(LEGACY_STORY_IMAGE_ASSISTANT_MODE)).toBe(false)
  })

  it('normalizes the legacy story alias', () => {
    expect(normalizeChatModeId(LEGACY_STORY_IMAGE_ASSISTANT_MODE)).toBe('image_assistant')
    expect(normalizeChatModeId('image_assistant')).toBe('image_assistant')
    expect(normalizeChatModeId('inventar')).toBe('inventar')
    expect(normalizeChatModeId('general')).toBe(DEFAULT_CHAT_MODE)
    expect(normalizeChatModeId('nope')).toBeNull()
  })

  it('keeps image assistant behind chatImageAssistant (MVP off)', () => {
    expect(isChatImageAssistantEnabled()).toBe(false)
    expect(isChatModeEnabled('image_assistant')).toBe(false)
    expect(isChatModeEnabled('general')).toBe(true)
    expect(isChatModeEnabled('inventar')).toBe(true)
    expect(getEnabledAdvisorChatModeIds()).toEqual(['general'])
    expect(coerceEnabledChatMode('image_assistant')).toBe('general')
    expect(coerceEnabledChatMode('general')).toBe('general')
  })
})
