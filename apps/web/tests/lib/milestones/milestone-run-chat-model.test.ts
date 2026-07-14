import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'

describe('patchMilestoneSchema runChatModel', () => {
  it('accepts a valid allowlisted runChatModel', () => {
    const parsed = patchMilestoneSchema.safeParse({ runChatModel: 'openai/gpt-4o' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.runChatModel).toBe('openai/gpt-4o')
    }
  })

  it('rejects an unknown runChatModel', () => {
    const parsed = patchMilestoneSchema.safeParse({ runChatModel: 'unknown/model' })
    expect(parsed.success).toBe(false)
  })
})
