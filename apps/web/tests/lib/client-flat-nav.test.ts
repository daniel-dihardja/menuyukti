import { describe, expect, it } from 'vitest'

import { orderClientFlatNav, partitionClientNav } from '@/lib/client-flat-nav'

describe('partitionClientNav', () => {
  it('puts Locations, Inventory, and Team in core and Services separately', () => {
    const partitioned = partitionClientNav([
      { key: 'team' },
      { key: 'services' },
      { key: 'branches' },
      { key: 'inventar' },
    ])
    expect(partitioned.core.map((item) => item.key)).toEqual(['branches', 'inventar', 'team'])
    expect(partitioned.services.map((item) => item.key)).toEqual(['services'])
    expect(partitioned.other).toEqual([])
  })

  it('keeps unexpected keys in other without reordering them relative to each other', () => {
    const partitioned = partitionClientNav([
      { key: 'home' },
      { key: 'team' },
      { key: 'dashboard' },
      { key: 'inventar' },
      { key: 'services' },
      { key: 'branches' },
    ])
    expect(partitioned.core.map((item) => item.key)).toEqual(['branches', 'inventar', 'team'])
    expect(partitioned.services.map((item) => item.key)).toEqual(['services'])
    expect(partitioned.other.map((item) => item.key)).toEqual(['home', 'dashboard'])
  })
})

describe('orderClientFlatNav', () => {
  it('orders Locations, Inventory, Team, then Services', () => {
    const ordered = orderClientFlatNav([
      { key: 'team' },
      { key: 'branches' },
      { key: 'services' },
      { key: 'inventar' },
    ])
    expect(ordered.map((item) => item.key)).toEqual(['branches', 'inventar', 'team', 'services'])
  })

  it('keeps other keys after core and services without reordering them relative to each other', () => {
    const ordered = orderClientFlatNav([
      { key: 'home' },
      { key: 'team' },
      { key: 'dashboard' },
      { key: 'inventar' },
      { key: 'services' },
      { key: 'branches' },
    ])
    expect(ordered.map((item) => item.key)).toEqual([
      'branches',
      'inventar',
      'team',
      'services',
      'home',
      'dashboard',
    ])
  })
})
