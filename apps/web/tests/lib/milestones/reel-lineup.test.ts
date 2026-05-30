import { describe, expect, it } from 'vitest'

import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { EMPTY_REEL_LINEUP_DATA } from '@/lib/milestones/reel-lineup'

describe('reel_lineup empty data', () => {
  it('parses empty reel lineup milestone data', () => {
    const parsed = reelLineupMilestoneDataSchema.safeParse(EMPTY_REEL_LINEUP_DATA)
    expect(parsed.success).toBe(true)
  })
})
