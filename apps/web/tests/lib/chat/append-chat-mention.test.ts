import { describe, expect, it } from 'vitest'

import { appendChatMention } from '@/lib/chat/append-chat-mention'

describe('appendChatMention', () => {
  it('replaces a lone @ trigger instead of duplicating it', () => {
    expect(appendChatMention('@', 'Menu item heatmap')).toBe('@Menu item heatmap ')
  })

  it('replaces a partial @ filter query', () => {
    expect(appendChatMention('@Menu', 'Menu item heatmap')).toBe('@Menu item heatmap ')
  })

  it('appends after existing text when not in an @ trigger', () => {
    expect(appendChatMention('Compare ', 'Menu item heatmap')).toBe('Compare @Menu item heatmap ')
  })
})
