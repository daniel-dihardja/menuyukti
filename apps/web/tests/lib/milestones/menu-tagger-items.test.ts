import { describe, expect, it } from 'vitest'

import { groupMenuTaggerItemsByCategory } from '@/lib/milestones/menu-tagger-items'

describe('groupMenuTaggerItemsByCategory', () => {
  it('preserves first-seen category order instead of sorting alphabetically', () => {
    const grouped = groupMenuTaggerItemsByCategory(
      [
        { role: 'star', category: 'FOOD', name: 'Burger' },
        { role: 'puzzle', category: 'FOOD', name: 'Salad' },
        { role: 'star', category: 'DRINK', name: 'Cola' },
      ],
      '(uncategorized)',
    )

    expect(grouped.map(([category]) => category)).toEqual(['FOOD', 'DRINK'])
    expect(grouped[0]?.[1].star.map((item) => item.name)).toEqual(['Burger'])
    expect(grouped[1]?.[1].star.map((item) => item.name)).toEqual(['Cola'])
  })
})
