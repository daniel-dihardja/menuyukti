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

  it('treats only pro as unrestricted', () => {
    expect(isProPlan('pro')).toBe(true)
    expect(isProPlan('free')).toBe(false)
  })

  it('allows home nav on free only; pro unlocks operator nav', () => {
    expect(isNavKeyAllowedForPlan('home', 'free')).toBe(true)
    expect(isNavKeyAllowedForPlan('home', 'pro')).toBe(false)
    expect(isNavKeyAllowedForPlan('chat', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('branches', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('inventar', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('usage', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('team', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('posts', 'pro')).toBe(true)
    expect(isNavKeyAllowedForPlan('chat', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('branches', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('inventar', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('usage', 'free')).toBe(false)
    expect(isNavKeyAllowedForPlan('team', 'free')).toBe(false)
    expect(FREE_NAV_KEYS.has('home')).toBe(true)
    expect(FREE_NAV_KEYS.size).toBe(1)
    expect(PRO_NAV_KEYS.has('branches')).toBe(true)
    expect(PRO_NAV_KEYS.has('inventar')).toBe(true)
    expect(PRO_NAV_KEYS.has('usage')).toBe(true)
  })

  it('allows home, continue, and profile on free; pro allows operator routes', () => {
    expect(isPathnameAllowedForPlan('/advisor', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/calendar', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/analytics/locations', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/inventar', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/usage', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/ig-studio', 'free')).toBe(false)
    expect(isPathnameAllowedForPlan('/home', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/continue', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/account', 'free')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/team', 'free')).toBe(false)

    expect(isPathnameAllowedForPlan('/advisor', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/analytics/locations', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/inventar', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/usage', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/ig-studio', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/profile/team', 'pro')).toBe(true)
    expect(isPathnameAllowedForPlan('/home', 'pro')).toBe(true)
  })

  it('uses customer home for free and advisor for pro', () => {
    expect(getDefaultPathForPlan('free')).toBe('/home')
    expect(getDefaultPathForPlan('pro')).toBe('/advisor')
  })
})
