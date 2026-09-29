import { describe, expect, it } from 'vitest'

import { orderClientFlatNav } from '@/lib/client-flat-nav'

describe('orderClientFlatNav', () => {
  it('orders Locations, Inventory, then Team', () => {
    const ordered = orderClientFlatNav([
      { key: 'team' },
      { key: 'branches' },
      { key: 'inventar' },
    ])
    expect(ordered.map((item) => item.key)).toEqual(['branches', 'inventar', 'team'])
  })

  it('keeps other keys after the primary three without reordering them relative to each other', () => {
    const ordered = orderClientFlatNav([
      { key: 'home' },
      { key: 'team' },
      { key: 'dashboard' },
      { key: 'inventar' },
      { key: 'branches' },
    ])
    expect(ordered.map((item) => item.key)).toEqual([
      'branches',
      'inventar',
      'team',
      'home',
      'dashboard',
    ])
  })
})
