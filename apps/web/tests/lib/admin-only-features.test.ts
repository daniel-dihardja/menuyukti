import { describe, expect, it } from 'vitest'

import {
  isActionMenuItemHiddenFromNonAdmin,
  isNavItemHiddenFromNonAdmin,
  pathnameRequiresAdmin,
} from '@/lib/admin-only-features'

describe('admin-only-features', () => {
  it('marks operator product nav keys as admin-only', () => {
    expect(isNavItemHiddenFromNonAdmin('chat')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('playbooks')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('media')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('calendar')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('crm')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('crmApps')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('crmRegistrations')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('printShop')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('usage')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('staff')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('branches')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('inventar')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('team')).toBe(false)
  })

  it('requires admin for newly gated route prefixes', () => {
    expect(pathnameRequiresAdmin('/advisor')).toBe(false)
    expect(pathnameRequiresAdmin('/advisor/thread-1')).toBe(false)
    expect(pathnameRequiresAdmin('/agent')).toBe(false)
    expect(pathnameRequiresAdmin('/playbooks')).toBe(true)
    expect(pathnameRequiresAdmin('/playbooks/holiday')).toBe(true)
    expect(pathnameRequiresAdmin('/media')).toBe(false)
    expect(pathnameRequiresAdmin('/content/legacy')).toBe(false)
    expect(pathnameRequiresAdmin('/calendar')).toBe(true)
    expect(pathnameRequiresAdmin('/crm')).toBe(true)
    expect(pathnameRequiresAdmin('/crm/apps')).toBe(true)
    expect(pathnameRequiresAdmin('/shop')).toBe(true)
    expect(pathnameRequiresAdmin('/shop/poster-1')).toBe(true)
    expect(pathnameRequiresAdmin('/usage')).toBe(false)
    expect(pathnameRequiresAdmin('/staff')).toBe(true)
    expect(pathnameRequiresAdmin('/ig-studio')).toBe(true)
    expect(pathnameRequiresAdmin('/print-orders')).toBe(true)
  })

  it('does not require admin for pro client home surfaces', () => {
    expect(pathnameRequiresAdmin('/analytics/locations')).toBe(false)
    expect(pathnameRequiresAdmin('/analytics/locations/1/reports')).toBe(false)
    expect(pathnameRequiresAdmin('/inventar')).toBe(false)
    expect(pathnameRequiresAdmin('/profile/team')).toBe(false)
    expect(pathnameRequiresAdmin('/team')).toBe(false)
    expect(pathnameRequiresAdmin('/home')).toBe(false)
    expect(pathnameRequiresAdmin('/advisor')).toBe(false)
    expect(pathnameRequiresAdmin('/media')).toBe(false)
  })

  it('keeps analytics action menu admin keys', () => {
    expect(isActionMenuItemHiddenFromNonAdmin('heatmap')).toBe(true)
    expect(isActionMenuItemHiddenFromNonAdmin('menu-combos')).toBe(true)
    expect(pathnameRequiresAdmin('/analytics/abc/heatmap')).toBe(true)
    expect(pathnameRequiresAdmin('/analytics/abc/matrix')).toBe(false)
  })
})
