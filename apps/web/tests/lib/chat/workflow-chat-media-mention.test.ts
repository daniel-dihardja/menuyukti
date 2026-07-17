import { describe, expect, it } from 'vitest'

import {
  clearWorkflowChatMentionTrigger,
  formatMediaMentionLabel,
} from '@/lib/chat/workflow-chat-media-mention'

describe('workflow-chat-media-mention', () => {
  it('clears start-anchored @ triggers', () => {
    expect(clearWorkflowChatMentionTrigger('@foo')).toBe('')
    expect(clearWorkflowChatMentionTrigger('hello')).toBe('hello')
  })

  it('truncates long UUID filenames', () => {
    const name = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'
    const label = formatMediaMentionLabel(name)
    expect(label.endsWith('.webp')).toBe(true)
    expect(label.length).toBeLessThan(name.length)
  })
})
