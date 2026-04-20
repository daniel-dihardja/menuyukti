import { describe, expect, it } from 'vitest'

import {
  emptyPromotionCandidatesMilestoneData,
  milestonedataDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

describe('promotionCandidatesMilestoneDataSchema', () => {
  it('parses a valid promotion milestone payload', () => {
    const data = emptyPromotionCandidatesMilestoneData('note')
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse(data)
    expect(parsed.success).toBe(true)
  })

  it('rejects markdown string milestonedata', () => {
    const parsed = milestonedataDataSchema.safeParse({ data: '## hello' })
    expect(parsed.success).toBe(false)
  })

  it('wraps promotion object in milestonedataDataSchema', () => {
    const inner = emptyPromotionCandidatesMilestoneData()
    const parsed = milestonedataDataSchema.safeParse({ data: inner })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.data).toEqual(inner)
  })
})
