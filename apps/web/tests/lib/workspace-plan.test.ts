import { describe, expect, it } from 'vitest'

import {
  FREE_NAV_KEYS,
  PRO_NAV_KEYS,
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

  it('classifies plan labels without using them for access control', () => {
    expect(isProPlan('pro')).toBe(true)
    expect(isProPlan('free')).toBe(false)
  })

  it('allows operator nav keys; hides branches sidebar key', () => {
    expect(isNavKeyAllowedForPlan('home')).toBe(true)
    expect(isNavKeyAllowedForPlan('branches')).toBe(false)
    expect(isNavKeyAllowedForPlan('chat')).toBe(true)
    expect(isNavKeyAllowedForPlan('services')).toBe(true)
    expect(isNavKeyAllowedForPlan('inventar')).toBe(true)
    expect(isNavKeyAllowedForPlan('usage')).toBe(true)
    expect(isNavKeyAllowedForPlan('team')).toBe(true)
    expect(isNavKeyAllowedForPlan('posts')).toBe(true)
    expect(FREE_NAV_KEYS.has('home')).toBe(true)
    expect(FREE_NAV_KEYS.size).toBe(1)
    expect(PRO_NAV_KEYS.has('home')).toBe(true)
    expect(PRO_NAV_KEYS.has('branches')).toBe(false)
    expect(PRO_NAV_KEYS.has('services')).toBe(true)
    expect(PRO_NAV_KEYS.has('inventar')).toBe(true)
    expect(PRO_NAV_KEYS.has('usage')).toBe(true)
    expect(PRO_NAV_KEYS.has('chat')).toBe(true)
    expect(PRO_NAV_KEYS.has('media')).toBe(true)
  })

  it('allows all product paths (admin-only gated separately)', () => {
    expect(isPathnameAllowedForPlan()).toBe(true)
  })

  it('uses Advisor as the default authenticated path', () => {
    expect(getDefaultPathForPlan()).toBe('/advisor')
  })
})
