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

  it('allows operator nav on all plans; hides branches sidebar key', () => {
    expect(isNavKeyAllowedForPlan('home', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('home', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('branches', 'pro')).toBe(false)
    expect(isNavKeyAllowedForPlan('branches', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('chat', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('services', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('inventar', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('usage', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('team', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('posts', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('chat', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('services', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('inventar', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('usage', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('team', 'free')).toBe(true)
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

  it('allows all product paths on free and pro (admin-only gated separately)', () => {
    expect(isPathnameAllowedForPlan('/advisor', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/calendar', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/locations', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/inventar', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/services', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/usage', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/ig-studio', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/home', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/continue', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/account', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/team', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/team', 'free')).toBe(true)

    expect(isPathnameAllowedForPlan('/advisor', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/locations', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/inventar', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/services', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/usage', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/ig-studio', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/team', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/team', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/home', 'pro')).toBe(true)
  })

  it('uses shared customer home for free and pro', () => {
    expect(getDefaultPathForPlan('free')).toBe('/home')
    expect(getDefaultPathForPlan('pro')).toBe('/home')
  })
})
