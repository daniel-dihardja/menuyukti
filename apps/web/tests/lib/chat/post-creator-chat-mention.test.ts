import { describe, expect, it } from 'vitest'

import {
  clearTrailingMentionTrigger,
  parseMentionAtEnd,
} from '@/lib/chat/post-creator-chat-mention'

describe('post-creator-chat-mention', () => {
  it('parses a trailing @ mention', () => {
    expect(parseMentionAtEnd('@')).toEqual({ filterQuery: '', mentionStart: 0 })
    expect(parseMentionAtEnd('hello @pre')).toEqual({ filterQuery: 'pre', mentionStart: 6 })
  })

  it('returns null when @ is not at the end', () => {
    expect(parseMentionAtEnd('@foo bar')).toBeNull()
    expect(parseMentionAtEnd('hello')).toBeNull()
  })

  it('clears the trailing mention trigger', () => {
    expect(clearTrailingMentionTrigger('@')).toBe('')
    expect(clearTrailingMentionTrigger('hello @cur')).toBe('hello')
    expect(clearTrailingMentionTrigger('hello')).toBe('hello')
  })
})
