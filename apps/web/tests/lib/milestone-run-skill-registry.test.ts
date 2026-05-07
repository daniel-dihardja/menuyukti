import { describe, expect, it } from 'vitest'

import { MILESTONE_RUN_SKILL_REGISTRY } from '@/lib/milestone-run-skill-registry'

describe('milestone run skill registry', () => {
  it('includes fixed preset runtime skills exposed by backend', () => {
    const ids = MILESTONE_RUN_SKILL_REGISTRY.map((row) => row.id)
    expect(ids).toContain('public_holidays')
    expect(ids).toContain('campaign_brief')
    expect(ids).toContain('post_scheduler')
    expect(ids).toContain('generic')
  })
})
