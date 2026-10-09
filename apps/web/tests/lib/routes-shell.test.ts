import { describe, expect, it } from 'vitest'

import {
  CUSTOMER_AUTH_PREFIXES,
  OPERATOR_APP_SHELL_PREFIXES,
  isClerkProtectedAppPath,
  isCustomerAuthPath,
  isOperatorAppShellPath,
  isPublicLocationSurfacePath,
} from '@/lib/routes'

describe('routes shell helpers', () => {
  it('treats operator paths as sidebar shell (hides MainHeader)', () => {
    expect(isOperatorAppShellPath('/advisor')).toBe(true)
    expect(isOperatorAppShellPath('/analytics/locations')).toBe(true)
    expect(isOperatorAppShellPath('/staff')).toBe(true)
    expect(isOperatorAppShellPath('/services')).toBe(true)
    expect(isOperatorAppShellPath('/services/digital-menu')).toBe(true)
    expect(isOperatorAppShellPath('/team')).toBe(true)
    expect(OPERATOR_APP_SHELL_PREFIXES).not.toContain('/home')
    expect(OPERATOR_APP_SHELL_PREFIXES).not.toContain('/profile')
  })

  it('treats customer paths as auth area, not operator shell', () => {
    expect(isCustomerAuthPath('/home')).toBe(true)
    expect(isCustomerAuthPath('/continue')).toBe(true)
    expect(isCustomerAuthPath('/profile/account')).toBe(true)
    expect(isOperatorAppShellPath('/home')).toBe(false)
    expect(isOperatorAppShellPath('/profile')).toBe(false)
    expect(CUSTOMER_AUTH_PREFIXES).toEqual(['/home', '/continue', '/profile'])
  })

  it('protects both shells for Clerk / robots', () => {
    expect(isClerkProtectedAppPath('/advisor')).toBe(true)
    expect(isClerkProtectedAppPath('/home')).toBe(true)
    expect(isClerkProtectedAppPath('/shop')).toBe(true)
    expect(isClerkProtectedAppPath('/services')).toBe(true)
    expect(isClerkProtectedAppPath('/services/digital-menu')).toBe(true)
    expect(isClerkProtectedAppPath('/team')).toBe(true)
    expect(isClerkProtectedAppPath('/m/cafe')).toBe(false)
    expect(isClerkProtectedAppPath('/cafe/menu')).toBe(false)
    expect(isClerkProtectedAppPath('/')).toBe(false)
  })

  it('treats public location paths as guest surfaces (no product mobile nav)', () => {
    expect(isPublicLocationSurfacePath('/cafe')).toBe(true)
    expect(isPublicLocationSurfacePath('/cafe/menu')).toBe(true)
    expect(isPublicLocationSurfacePath('/cafe/menu/t/12')).toBe(true)
    expect(isPublicLocationSurfacePath('/cafe/pick-and-win')).toBe(true)
    expect(isPublicLocationSurfacePath('/m/cafe')).toBe(true)
    expect(isPublicLocationSurfacePath('/m/cafe/t/12')).toBe(true)
    expect(isPublicLocationSurfacePath('/l/cafe')).toBe(true)
    expect(isPublicLocationSurfacePath('/home')).toBe(false)
    expect(isPublicLocationSurfacePath('/services')).toBe(false)
    expect(isPublicLocationSurfacePath('/shop')).toBe(false)
    expect(isPublicLocationSurfacePath('/')).toBe(false)
  })
})
