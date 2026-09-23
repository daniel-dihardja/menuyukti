import { describe, expect, it } from 'vitest'

import {
  CUSTOMER_AUTH_PREFIXES,
  OPERATOR_APP_SHELL_PREFIXES,
  isClerkProtectedAppPath,
  isCustomerAuthPath,
  isOperatorAppShellPath,
  isProtectedAppShellPath,
} from '@/lib/routes'

describe('routes shell helpers', () => {
  it('treats operator paths as sidebar shell (hides MainHeader)', () => {
    expect(isOperatorAppShellPath('/advisor')).toBe(true)
    expect(isOperatorAppShellPath('/analytics/locations')).toBe(true)
    expect(isOperatorAppShellPath('/staff')).toBe(true)
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
    expect(isClerkProtectedAppPath('/m/cafe')).toBe(false)
    expect(isClerkProtectedAppPath('/')).toBe(false)
  })

  it('keeps isProtectedAppShellPath as operator-shell alias', () => {
    expect(isProtectedAppShellPath('/advisor')).toBe(true)
    expect(isProtectedAppShellPath('/home')).toBe(false)
  })
})
