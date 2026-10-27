import { describe, expect, it } from 'vitest'

import {
  getEnabledPlaybookCatalog,
  isPlaybookSlugEnabled,
  isPlaybookTypeEnabled,
} from '@/lib/playbooks/catalog'

describe('playbook catalog feature gates', () => {
  it('hides nearby locations when playbookNearbyLocations is off', () => {
    expect(isPlaybookSlugEnabled('nearby-locations')).toBe(false)
    expect(isPlaybookTypeEnabled('nearby_locations')).toBe(false)
    expect(getEnabledPlaybookCatalog().map((entry) => entry.id)).toEqual(['publicHolidays'])
  })

  it('keeps public holidays enabled', () => {
    expect(isPlaybookSlugEnabled('public-holidays')).toBe(true)
    expect(isPlaybookTypeEnabled('public_holidays')).toBe(true)
  })
})
