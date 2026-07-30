import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CHAT_MODE,
  isChatModeId,
  LEGACY_STORY_IMAGE_ASSISTANT_MODE,
  normalizeChatModeId,
} from '@/lib/chat/chat-modes'

describe('chat-modes', () => {
  it('accepts canonical mode ids', () => {
    expect(isChatModeId('general')).toBe(true)
    expect(isChatModeId('image_assistant')).toBe(true)
    expect(isChatModeId(LEGACY_STORY_IMAGE_ASSISTANT_MODE)).toBe(false)
  })

  it('normalizes the legacy story alias', () => {
    expect(normalizeChatModeId(LEGACY_STORY_IMAGE_ASSISTANT_MODE)).toBe('image_assistant')
    expect(normalizeChatModeId('image_assistant')).toBe('image_assistant')
    expect(normalizeChatModeId('general')).toBe(DEFAULT_CHAT_MODE)
    expect(normalizeChatModeId('nope')).toBeNull()
  })
})
