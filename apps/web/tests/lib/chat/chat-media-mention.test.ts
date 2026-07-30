import { describe, expect, it } from 'vitest'

import { clearChatMentionTrigger, formatMediaMentionLabel } from '@/lib/chat/chat-media-mention'

describe('chat-media-mention', () => {
  it('clears start-anchored @ triggers', () => {
    expect(clearChatMentionTrigger('@foo')).toBe('')
    expect(clearChatMentionTrigger('hello')).toBe('hello')
  })

  it('truncates long UUID filenames', () => {
    const name = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'
    const label = formatMediaMentionLabel(name)
    expect(label.endsWith('.webp')).toBe(true)
    expect(label.length).toBeLessThan(name.length)
  })
})
