import { describe, expect, it } from 'vitest'

import {
  igMenuPickerEntrySchema,
  igPlanEntrySchema,
  igTextEntrySchema,
  parseIgScheduleEntries,
} from '@/lib/graphql/node-schemas'

const planEntry = {
  day: 'wednesday' as const,
  slot: '14:30',
  objective: 'Increase afternoon traffic',
  pillar: 'hero' as const,
  mealPeriod: 'afternoon',
  productRole: 'puzzle' as const,
  slotStrategy: 'aggressively_grow' as const,
  slotKey: 'wednesday-afternoon',
}

describe('ig-schedule entry chain', () => {
  it('accepts a full text entry through the extend chain', () => {
    const textEntry = {
      ...planEntry,
      menuItems: [{ menu: 'Truffle Fries', rationale: 'Puzzle hero' }],
      type: 'post' as const,
      formatRationale: 'Single dish feed post',
      texts: [
        { field: 'headline', value: 'Crispy truffle fries' },
        { field: 'subline', value: 'Afternoon treat' },
        { field: 'productName', value: 'Truffle Fries' },
        { field: 'caption', value: 'Come try our fries.' },
      ],
    }
    expect(igTextEntrySchema.safeParse(textEntry).success).toBe(true)
    expect(parseIgScheduleEntries({ entries: [textEntry] }, 'text')).toHaveLength(1)
  })

  it('rejects plan-only rows as menu picker entries', () => {
    expect(igPlanEntrySchema.safeParse(planEntry).success).toBe(true)
    expect(igMenuPickerEntrySchema.safeParse(planEntry).success).toBe(false)
    expect(parseIgScheduleEntries({ entries: [planEntry] }, 'menu')).toHaveLength(0)
    expect(parseIgScheduleEntries({ entries: [planEntry] }, 'plan')).toHaveLength(1)
  })
})
