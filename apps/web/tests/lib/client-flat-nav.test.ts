import { describe, expect, it } from 'vitest'

import { orderClientFlatNav, partitionClientNav, splitClientNavAtAi } from '@/lib/client-flat-nav'

describe('orderClientFlatNav', () => {
  it('orders Locations, Services, then AI tools', () => {
    const ordered = orderClientFlatNav([
      { key: 'usage' },
      { key: 'playbooks' },
      { key: 'services' },
      { key: 'chat' },
      { key: 'home' },
    ])
    expect(ordered.map((item) => item.key)).toEqual([
      'home',
      'services',
      'chat',
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
  it('puts AI and Playbooks after the first separator, AI usage after the second', () => {
    const split = splitClientNavAtAi([
      { key: 'home' },
      { key: 'services' },
      { key: 'chat' },
      { key: 'playbooks' },
      { key: 'usage' },
    ])
    expect(split.primary.map((item) => item.key)).toEqual(['home', 'services'])
    expect(split.ai.map((item) => item.key)).toEqual(['chat', 'playbooks'])
    expect(split.usage.map((item) => item.key)).toEqual(['usage'])
  })
})
