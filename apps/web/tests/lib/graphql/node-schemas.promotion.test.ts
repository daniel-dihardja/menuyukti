import { describe, expect, it } from 'vitest'

import {
  emptyPromotionCandidatesMilestoneData,
  milestonedataValueSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

describe('promotionCandidatesMilestoneDataSchema', () => {
  it('parses a valid promotion milestone payload', () => {
    const data = emptyPromotionCandidatesMilestoneData('note')
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse(data)
    expect(parsed.success).toBe(true)
  })

  it('rejects markdown string as milestonedata root', () => {
    const parsed = milestonedataValueSchema.safeParse('## hello')
    expect(parsed.success).toBe(false)
  })

  it('accepts flat promotion object as milestonedataValueSchema', () => {
    const inner = emptyPromotionCandidatesMilestoneData()
    const parsed = milestonedataValueSchema.safeParse(inner)
    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual(inner)
  })
})
