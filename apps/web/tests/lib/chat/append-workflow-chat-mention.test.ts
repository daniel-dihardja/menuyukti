import { describe, expect, it } from 'vitest'

import { appendWorkflowChatMention } from '@/lib/chat/append-workflow-chat-mention'

describe('appendWorkflowChatMention', () => {
  it('replaces a lone @ trigger instead of duplicating it', () => {
    expect(appendWorkflowChatMention('@', 'Menu item heatmap')).toBe('@Menu item heatmap ')
  })

  it('replaces a partial @ filter query', () => {
    expect(appendWorkflowChatMention('@Menu', 'Menu item heatmap')).toBe('@Menu item heatmap ')
  })

  it('appends after existing text when not in an @ trigger', () => {
    expect(appendWorkflowChatMention('Compare ', 'Menu item heatmap')).toBe(
      'Compare @Menu item heatmap ',
    )
  })
})
