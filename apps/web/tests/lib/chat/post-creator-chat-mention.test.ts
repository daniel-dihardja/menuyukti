import { describe, expect, it } from 'vitest'

import {
  clearTrailingMentionTrigger,
  filterMediaForMention,
  matchesMentionFilter,
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

  it('matches mention filter against name and label', () => {
    expect(matchesMentionFilter('', 'abc.webp', 'Current preview')).toBe(true)
    expect(matchesMentionFilter('cur', 'abc.webp', 'Current preview')).toBe(true)
    expect(matchesMentionFilter('abc', 'abc.webp', 'Current preview')).toBe(true)
    expect(matchesMentionFilter('zzz', 'abc.webp', 'Current preview')).toBe(false)
  })

  it('filters media catalog items and excludes attached names', () => {
    const items = [{ name: 'photo-one.webp' }, { name: 'photo-two.webp' }, { name: 'other.png' }]
    expect(filterMediaForMention(items, 'photo').map((i) => i.name)).toEqual([
      'photo-one.webp',
      'photo-two.webp',
    ])
    expect(
      filterMediaForMention(items, '', new Set(['photo-one.webp'])).map((i) => i.name),
    ).toEqual(['photo-two.webp', 'other.png'])
  })
})
