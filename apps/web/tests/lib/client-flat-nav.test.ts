import { describe, expect, it } from 'vitest'

import { orderClientFlatNav, partitionClientNav, splitClientNavAtAi } from '@/lib/client-flat-nav'

describe('orderClientFlatNav', () => {
  it('orders AI Analytics, Locations, Guests, Playbooks, then AI usage', () => {
    const ordered = orderClientFlatNav([
      { key: 'usage' },
      { key: 'playbooks' },
      { key: 'services' },
      { key: 'chat' },
      { key: 'home' },
    ])
    expect(ordered.map((item) => item.key)).toEqual([
      'chat',
      'home',
      'services',
      'playbooks',
      'usage',
    ])
  })

  it('keeps other keys after ranked items without reordering them relative to each other', () => {
    const ordered = orderClientFlatNav([
      { key: 'media' },
      { key: 'services' },
      { key: 'calendar' },
      { key: 'home' },
    ])
    expect(ordered.map((item) => item.key)).toEqual(['home', 'services', 'media', 'calendar'])
  })
})

describe('partitionClientNav', () => {
  it('splits Locations and Services for legacy callers', () => {
    const partitioned = partitionClientNav([
      { key: 'chat' },
      { key: 'services' },
      { key: 'home' },
      { key: 'usage' },
    ])
    expect(partitioned.core.map((item) => item.key)).toEqual(['home'])
    expect(partitioned.services.map((item) => item.key)).toEqual(['services'])
    expect(partitioned.other.map((item) => item.key)).toEqual(['chat', 'usage'])
  })
})

describe('splitClientNavAtAi', () => {
  it('pairs AI Analytics with Locations, Guests with Playbooks, then AI usage', () => {
    const split = splitClientNavAtAi([
      { key: 'chat' },
      { key: 'home' },
      { key: 'services' },
      { key: 'playbooks' },
      { key: 'usage' },
    ])
    expect(split.primary.map((item) => item.key)).toEqual(['chat', 'home'])
    expect(split.guests.map((item) => item.key)).toEqual(['services', 'playbooks'])
    expect(split.usage.map((item) => item.key)).toEqual(['usage'])
  })
})
