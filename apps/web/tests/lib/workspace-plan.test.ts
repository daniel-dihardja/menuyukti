import { describe, expect, it } from 'vitest'

import {
  FREE_NAV_KEYS,
  getDefaultPathForPlan,
  isNavKeyAllowedForPlan,
  isPathnameAllowedForPlan,
  isProPlan,
  normalizeWorkspacePlan,
} from '@/lib/workspace-plan'

describe('workspace-plan', () => {
  it('normalizes unknown plans to free', () => {
    expect(normalizeWorkspacePlan('pro')).toBe('pro')
    expect(normalizeWorkspacePlan('free')).toBe('free')
    expect(normalizeWorkspacePlan(null)).toBe('free')
    expect(normalizeWorkspacePlan('enterprise')).toBe('free')
  })

  it('treats only pro as unrestricted', () => {
    expect(isProPlan('pro')).toBe(true)
    expect(isProPlan('free')).toBe(false)
  })

  it('allows free nav keys only on free plan', () => {
    expect(isNavKeyAllowedForPlan('chat', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('chat', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('reports', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('branches', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('inventar', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('team', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('usage', 'free')).toBe(true)
    expect(FREE_NAV_KEYS.has('calendar')).toBe(false)
  })

  it('allows free route prefixes and analytics report detail paths', () => {
    expect(isPathnameAllowedForPlan('/advisor', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/calendar', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/analytics/locations', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/locations/create', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/locations/reports', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/locations/1/reports', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/sales', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/analytics/42/matrix', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/inventar', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/team', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/usage', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/advisor', 'pro')).toBe(true)
  })

  it('uses locations home for free and advisor for pro', () => {
    expect(getDefaultPathForPlan('free')).toBe('/analytics/locations')
    expect(getDefaultPathForPlan('pro')).toBe('/advisor')
  })
})
