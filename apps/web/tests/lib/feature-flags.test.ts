import { describe, expect, it } from 'vitest'

import {
  getDefaultAuthenticatedPath,
  isNavKeyEnabled,
  isPathnameFeatureEnabled,
} from '@/lib/feature-flags'

describe('feature-flags', () => {
  it('reports release-aligned nav surface (workflows/reports/branches/crm/team/media/calendar on)', () => {
    expect(isNavKeyEnabled('dashboard')).toBe(false)
    expect(isNavKeyEnabled('media')).toBe(true)
    expect(isNavKeyEnabled('posts')).toBe(false)
    expect(isNavKeyEnabled('calendar')).toBe(true)
    expect(isNavKeyEnabled('printShop')).toBe(false)
    expect(isNavKeyEnabled('workflows')).toBe(true)
    expect(isNavKeyEnabled('reports')).toBe(true)
    expect(isNavKeyEnabled('branches')).toBe(true)
    expect(isNavKeyEnabled('crm')).toBe(true)
    expect(isNavKeyEnabled('team')).toBe(true)
  })

  it('fails open for unknown nav keys', () => {
    expect(isNavKeyEnabled('notARealNavKey')).toBe(true)
  })

  it('disables nested paths for turned-off route prefixes', () => {
    expect(isPathnameFeatureEnabled('/ig-studio')).toBe(false)
    expect(isPathnameFeatureEnabled('/ig-studio/styles')).toBe(false)
    expect(isPathnameFeatureEnabled('/calendar')).toBe(true)
    expect(isPathnameFeatureEnabled('/crm')).toBe(true)
    expect(isPathnameFeatureEnabled('/crm/registrations')).toBe(true)
    expect(isPathnameFeatureEnabled('/media')).toBe(true)
    expect(isPathnameFeatureEnabled('/shop')).toBe(false)
    expect(isPathnameFeatureEnabled('/workflow/abc')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/sales')).toBe(true)
  })

  it('leaves unlisted paths enabled', () => {
    expect(isPathnameFeatureEnabled('/privacy')).toBe(true)
    expect(isPathnameFeatureEnabled('/login')).toBe(true)
    // Admin-gated via admin-only-features.json, not feature-flags.
    expect(isPathnameFeatureEnabled('/usage')).toBe(true)
    expect(isNavKeyEnabled('usage')).toBe(true)
  })

  it('returns /advisor as default authenticated path', () => {
    expect(getDefaultAuthenticatedPath()).toBe('/advisor')
  })
})
