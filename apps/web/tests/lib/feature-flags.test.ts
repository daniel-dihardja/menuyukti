import { describe, expect, it } from 'vitest'

import {
  getDefaultAuthenticatedPath,
  isActionMenuItemHiddenFromNonAdmin,
  isActionMenuKeyEnabled,
  isFeatureEnabled,
  isNavItemHiddenFromNonAdmin,
  isNavKeyEnabled,
  isPathnameFeatureEnabled,
  isServiceKeyFeatureEnabled,
  pathnameRequiresAdmin,
} from '@/lib/feature-flags'

describe('feature-flags', () => {
  it('reports operator product surface enabled state', () => {
    expect(isNavKeyEnabled('home')).toBe(true) // Locations (analytics), not customer /home
    expect(isNavKeyEnabled('dashboard')).toBe(false)
    expect(isNavKeyEnabled('media')).toBe(true)
    expect(isNavKeyEnabled('posts')).toBe(true)
    expect(isNavKeyEnabled('calendar')).toBe(true)
    expect(isNavKeyEnabled('printShop')).toBe(true)
    expect(isNavKeyEnabled('chat')).toBe(true)
    expect(isNavKeyEnabled('branches')).toBe(true)
    expect(isNavKeyEnabled('services')).toBe(false)
    expect(isNavKeyEnabled('playbooks')).toBe(true)
    expect(isNavKeyEnabled('crm')).toBe(true)
    expect(isNavKeyEnabled('usage')).toBe(true)
    expect(isNavKeyEnabled('inventar')).toBe(false)
    expect(isNavKeyEnabled('team')).toBe(false)
  })

  it('fails open for unknown nav keys', () => {
    expect(isNavKeyEnabled('notARealNavKey')).toBe(true)
  })

  it('enables operator route prefixes and nested menu paths', () => {
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
    expect(isPathnameFeatureEnabled('/analytics/locations')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/locations/1/menu')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/digital-menu')).toBe(true)
    expect(isPathnameFeatureEnabled('/playbooks')).toBe(true)
    expect(isPathnameFeatureEnabled('/usage')).toBe(true)
  })

  it('disables MVP-off inventar, team, guests, customer home, pos, and explore', () => {
    expect(isPathnameFeatureEnabled('/inventar')).toBe(false)
    expect(isPathnameFeatureEnabled('/inventar/catalog')).toBe(false)
    expect(isPathnameFeatureEnabled('/team')).toBe(false)
    expect(isFeatureEnabled('services')).toBe(false)
    expect(isPathnameFeatureEnabled('/services')).toBe(false)
    expect(isFeatureEnabled('home')).toBe(false)
    expect(isPathnameFeatureEnabled('/home')).toBe(false)
    expect(isFeatureEnabled('pos')).toBe(false)
    expect(isActionMenuKeyEnabled('pos')).toBe(false)
    expect(isFeatureEnabled('explore')).toBe(false)
    expect(isPathnameFeatureEnabled('/explore')).toBe(false)
  })

  it('enables playbooks routes and nav', () => {
    expect(isFeatureEnabled('playbooks')).toBe(true)
    expect(isPathnameFeatureEnabled('/playbooks')).toBe(true)
    expect(isNavKeyEnabled('playbooks')).toBe(true)
  })

  it('enables sales reports and COGS for advisor sales-report workflows', () => {
    expect(isFeatureEnabled('salesReports')).toBe(true)
    expect(isFeatureEnabled('cogs')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/locations/1/reports')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/locations/reports')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/sales')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/locations/1/cogs')).toBe(true)
    expect(isPathnameFeatureEnabled('/analytics/abc/cogs')).toBe(true)
    expect(isActionMenuKeyEnabled('reports')).toBe(true)
    expect(isActionMenuKeyEnabled('cogs')).toBe(true)
    expect(isActionMenuKeyEnabled('menu')).toBe(true)
  })

  it('keeps Digital Menu Order board reachable under serviceDigitalMenu', () => {
    expect(isFeatureEnabled('serviceDigitalMenu')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/digital-menu/42/orders')).toBe(true)
    expect(pathnameRequiresAdmin('/services/digital-menu/42/orders')).toBe(false)
    expect(isActionMenuKeyEnabled('digital-menu')).toBe(true)
    expect(isActionMenuKeyEnabled('order-board')).toBe(true)
  })

  it('leaves unlisted paths enabled', () => {
    expect(isPathnameFeatureEnabled('/privacy')).toBe(true)
    expect(isPathnameFeatureEnabled('/login')).toBe(true)
  })

  it('returns /advisor as default authenticated path', () => {
    expect(getDefaultAuthenticatedPath()).toBe('/advisor')
  })

  it('marks admin-audience nav keys', () => {
    expect(isNavItemHiddenFromNonAdmin('chat')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('playbooks')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('usage')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('media')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('calendar')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('crm')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('crmApps')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('crmRegistrations')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('printShop')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('staff')).toBe(true)
    expect(isNavItemHiddenFromNonAdmin('home')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('services')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('branches')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('inventar')).toBe(false)
    expect(isNavItemHiddenFromNonAdmin('team')).toBe(false)
  })

  it('requires admin for admin-audience route prefixes', () => {
    expect(pathnameRequiresAdmin('/media')).toBe(true)
    expect(pathnameRequiresAdmin('/calendar')).toBe(true)
    expect(pathnameRequiresAdmin('/crm')).toBe(true)
    expect(pathnameRequiresAdmin('/crm/apps')).toBe(true)
    expect(pathnameRequiresAdmin('/shop')).toBe(true)
    expect(pathnameRequiresAdmin('/shop/poster-1')).toBe(true)
    expect(pathnameRequiresAdmin('/staff')).toBe(true)
    expect(pathnameRequiresAdmin('/ig-studio')).toBe(true)
    expect(pathnameRequiresAdmin('/print-orders')).toBe(true)
  })

  it('does not require admin for restaurant MVP surfaces', () => {
    expect(pathnameRequiresAdmin('/analytics/locations')).toBe(false)
    expect(pathnameRequiresAdmin('/analytics/locations/1/menu')).toBe(false)
    expect(pathnameRequiresAdmin('/services/digital-menu')).toBe(false)
    expect(pathnameRequiresAdmin('/advisor')).toBe(false)
    expect(pathnameRequiresAdmin('/usage')).toBe(false)
    expect(pathnameRequiresAdmin('/profile')).toBe(false)
  })

  it('keeps analytics action menu admin keys', () => {
    expect(isActionMenuItemHiddenFromNonAdmin('heatmap')).toBe(true)
    expect(isActionMenuItemHiddenFromNonAdmin('menu-combos')).toBe(true)
    expect(pathnameRequiresAdmin('/analytics/abc/heatmap')).toBe(true)
    expect(pathnameRequiresAdmin('/analytics/abc/matrix')).toBe(false)
  })

  it('keeps only digital menu and voting services enabled for MVP', () => {
    expect(isFeatureEnabled('serviceDigitalMenu')).toBe(true)
    expect(isFeatureEnabled('serviceVoting')).toBe(true)
    expect(isFeatureEnabled('servicePickAndWin')).toBe(false)
    expect(isFeatureEnabled('servicePointSystem')).toBe(false)
    expect(isFeatureEnabled('servicePickupOffer')).toBe(false)
    expect(isFeatureEnabled('serviceStampCard')).toBe(false)
    expect(isFeatureEnabled('serviceCashback')).toBe(false)

    expect(isServiceKeyFeatureEnabled('digital_menu')).toBe(true)
    expect(isServiceKeyFeatureEnabled('voting')).toBe(true)
    expect(isServiceKeyFeatureEnabled('pick_and_win')).toBe(false)
    expect(isServiceKeyFeatureEnabled('point_system')).toBe(false)
    expect(isServiceKeyFeatureEnabled('pickup_offer')).toBe(false)
    expect(isServiceKeyFeatureEnabled('stamp_card')).toBe(false)
    expect(isServiceKeyFeatureEnabled('cashback')).toBe(false)

    expect(isPathnameFeatureEnabled('/services')).toBe(false)
    expect(isPathnameFeatureEnabled('/services/digital-menu')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/digital-menu/1')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/digital-menu/1/orders')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/voting')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/voting/1')).toBe(true)
    expect(isPathnameFeatureEnabled('/services/pick-and-win')).toBe(false)
    expect(isPathnameFeatureEnabled('/services/point-system')).toBe(false)
    expect(isPathnameFeatureEnabled('/services/pickup-offer')).toBe(false)
  })
})
