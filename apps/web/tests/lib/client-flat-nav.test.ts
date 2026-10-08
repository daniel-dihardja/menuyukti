import { describe, expect, it } from 'vitest'

import { orderClientFlatNav, partitionClientNav } from '@/lib/client-flat-nav'

describe('partitionClientNav', () => {
  it('puts Home, Inventory, and Team in core and Services separately', () => {
    const partitioned = partitionClientNav([
      { key: 'team' },
      { key: 'services' },
      { key: 'home' },
      { key: 'inventar' },
    ])
    expect(partitioned.core.map((item) => item.key)).toEqual(['home', 'inventar', 'team'])
    expect(partitioned.services.map((item) => item.key)).toEqual(['services'])
    expect(partitioned.other).toEqual([])
  })

  it('keeps unexpected keys in other without reordering them relative to each other', () => {
    const partitioned = partitionClientNav([
      { key: 'branches' },
      { key: 'team' },
      { key: 'dashboard' },
      { key: 'inventar' },
      { key: 'services' },
      { key: 'home' },
    ])
    expect(partitioned.core.map((item) => item.key)).toEqual(['home', 'inventar', 'team'])
    expect(partitioned.services.map((item) => item.key)).toEqual(['services'])
    expect(partitioned.other.map((item) => item.key)).toEqual(['branches', 'dashboard'])
  })
})

describe('orderClientFlatNav', () => {
  it('orders Home, Inventory, Team, then Services', () => {
    const ordered = orderClientFlatNav([
      { key: 'team' },
      { key: 'home' },
      { key: 'services' },
      { key: 'inventar' },
    ])
    expect(ordered.map((item) => item.key)).toEqual(['home', 'inventar', 'team', 'services'])
  })

  it('keeps other keys after core and services without reordering them relative to each other', () => {
    const ordered = orderClientFlatNav([
      { key: 'branches' },
      { key: 'team' },
      { key: 'dashboard' },
      { key: 'inventar' },
      { key: 'services' },
      { key: 'home' },
    ])
    expect(ordered.map((item) => item.key)).toEqual([
      'home',
      'inventar',
      'team',
      'services',
      'branches',
      'dashboard',
    ])
  })
})
