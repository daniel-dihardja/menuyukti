import { describe, expect, it } from 'vitest'

import {
  assertPresetRunRegistryInSync,
  MILESTONE_PRESET_RUN_REGISTRY,
} from '@/lib/milestone-run-skill-registry'
import { MILESTONE_PRESET_IDS } from '@/lib/graphql/node-schemas'

describe('milestone preset run registry', () => {
  it('matches MILESTONE_PRESET_IDS order and membership', () => {
    assertPresetRunRegistryInSync()
    const ids = MILESTONE_PRESET_RUN_REGISTRY.map((row) => row.id)
    expect(ids).toEqual([...MILESTONE_PRESET_IDS])
  })

  it('includes core campaign presets', () => {
    const ids = MILESTONE_PRESET_RUN_REGISTRY.map((row) => row.id)
    expect(ids).toContain('dates')
    expect(ids).toContain('restaurant_campaign_brief')
    expect(ids).toContain('scheduler')
    expect(ids).toContain('promotion_candidates')
  })
})
