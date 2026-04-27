import { describe, expect, it } from 'vitest'

import { MILESTONE_RUN_SKILL_REGISTRY } from '@/lib/milestone-run-skill-registry'

describe('milestone run skill registry', () => {
  it('includes fixed preset runtime skills exposed by backend', () => {
    const ids = MILESTONE_RUN_SKILL_REGISTRY.map((row) => row.id)
    expect(ids).toContain('public_holidays')
    expect(ids).toContain('brand_brief')
    expect(ids).toContain('promotion_candidates')
    expect(ids).toContain('scheduler')
    expect(ids).toContain('generic')
  })
})
