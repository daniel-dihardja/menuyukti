import { describe, expect, it } from 'vitest'

import { menuClustererMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { EMPTY_MENU_CLUSTERER_DATA } from '@/lib/milestones/menu-clusterer'

describe('menu_clusterer empty data', () => {
  it('parses empty menu clusterer milestone data', () => {
    const parsed = menuClustererMilestoneDataSchema.safeParse(EMPTY_MENU_CLUSTERER_DATA)
    expect(parsed.success).toBe(true)
  })
})
