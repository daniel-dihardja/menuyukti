import { describe, expect, it } from 'vitest'

import { segmentUserMessageForCommandBadges } from '@/lib/chat/segment-user-message-for-command-badges'

describe('segmentUserMessageForCommandBadges', () => {
  it('badges a lone slash command', () => {
    expect(segmentUserMessageForCommandBadges('/help')).toEqual([{ kind: 'slash', value: '/help' }])
  })

  it('badges slash after whitespace only', () => {
    expect(segmentUserMessageForCommandBadges('try /data now')).toEqual([
      { kind: 'text', value: 'try ' },
      { kind: 'slash', value: '/data' },
      { kind: 'text', value: ' now' },
    ])
  })

  it('does not treat slash inside a word as a command', () => {
    expect(segmentUserMessageForCommandBadges('price 5/usd')).toEqual([
      { kind: 'text', value: 'price 5/usd' },
    ])
  })

  it('uses mention titles for multi-word mentions', () => {
    expect(
      segmentUserMessageForCommandBadges('@Summer Promo what next?', {
        mentionTitles: ['Summer Promo', 'Brief'],
      }),
    ).toEqual([
      { kind: 'mention', value: '@Summer Promo' },
      { kind: 'text', value: ' what next?' },
    ])
  })

  it('falls back to first @ word when no title match', () => {
    expect(segmentUserMessageForCommandBadges('@Unknown title rest')).toEqual([
      { kind: 'mention', value: '@Unknown' },
      { kind: 'text', value: ' title rest' },
    ])
  })

  it('matches mention case-insensitively', () => {
    expect(
      segmentUserMessageForCommandBadges('@summer promo hi', {
        mentionTitles: ['Summer Promo'],
      }),
    ).toEqual([
      { kind: 'mention', value: '@summer promo' },
      { kind: 'text', value: ' hi' },
    ])
  })

  it('badges attached visualization titles', () => {
    expect(
      segmentUserMessageForCommandBadges('@Campaign Brief @Pair lift matrix question', {
        mentionTitles: ['Campaign Brief', 'Pair lift matrix'],
      }),
    ).toEqual([
      { kind: 'mention', value: '@Campaign Brief' },
      { kind: 'text', value: ' ' },
      { kind: 'mention', value: '@Pair lift matrix' },
      { kind: 'text', value: ' question' },
    ])
  })
})
