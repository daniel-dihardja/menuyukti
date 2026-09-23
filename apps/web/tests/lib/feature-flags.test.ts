import { describe, expect, it } from 'vitest'

import {
  getDefaultAuthenticatedPath,
  isNavKeyEnabled,
  isPathnameFeatureEnabled,
} from '@/lib/feature-flags'

describe('feature-flags', () => {
  it('reports operator product surface enabled (gated further by workspace plan)', () => {
    expect(isNavKeyEnabled('home')).toBe(true)
    expect(isNavKeyEnabled('dashboard')).toBe(false)
    expect(isNavKeyEnabled('media')).toBe(true)
    expect(isNavKeyEnabled('posts')).toBe(false)
    expect(isNavKeyEnabled('calendar')).toBe(true)
    expect(isNavKeyEnabled('printShop')).toBe(true)
    expect(isNavKeyEnabled('chat')).toBe(true)
    expect(isNavKeyEnabled('branches')).toBe(true)
    expect(isNavKeyEnabled('crm')).toBe(true)
    expect(isNavKeyEnabled('team')).toBe(true)
    expect(isNavKeyEnabled('usage')).toBe(true)
    expect(isNavKeyEnabled('inventar')).toBe(true)
  })

  it('fails open for unknown nav keys', () => {
    expect(isNavKeyEnabled('notARealNavKey')).toBe(true)
  })

  it('enables operator route prefixes (free guests still blocked by workspace plan)', () => {
    expect(isPathnameFeatureEnabled('/home')).toBe(true)
    expect(isPathnameFeatureEnabled('/continue')).toBe(true)
    expect(isPathnameFeatureEnabled('/ig-studio')).toBe(true)
    expect(isPathnameFeatureEnabled('/ig-studio/styles')).toBe(true)
    expect(isPathnameFeatureEnabled('/calendar')).toBe(true)
    expect(isPathnameFeatureEnabled('/crm')).toBe(true)
    expect(isPathnameFeatureEnabled('/crm/registrations')).toBe(true)
    expect(isPathnameFeatureEnabled('/media')).toBe(true)
    expect(isPathnameFeatureEnabled('/shop')).toBe(true)
    expect(isPathnameFeatureEnabled('/print-orders')).toBe(true)
    expect(isPathnameFeatureEnabled('/advisor')).toBe(true)
    expect(isPathnameFeatureEnabled('/advisor/abc')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/locations/reports')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/locations/1/reports')).toBe(true)
    expect(isPathnameFeatureEnabled('/usage')).toBe(true)
  })

  it('leaves unlisted paths enabled', () => {
    expect(isPathnameFeatureEnabled('/privacy')).toBe(true)
    expect(isPathnameFeatureEnabled('/login')).toBe(true)
    expect(isPathnameFeatureEnabled('/usage')).toBe(true)
    expect(isNavKeyEnabled('usage')).toBe(true)
  })

  it('returns /advisor as default authenticated path', () => {
    expect(getDefaultAuthenticatedPath()).toBe('/advisor')
  })
})
