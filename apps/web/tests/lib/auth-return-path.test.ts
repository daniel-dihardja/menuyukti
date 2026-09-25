import { describe, expect, it } from 'vitest'

import {
  AUTH_RETURN_TO_QUERY,
  buildAuthContinueUrl,
  buildLoginUrl,
  getSafeAuthReturnPath,
} from '@/lib/auth-return-path'

describe('getSafeAuthReturnPath', () => {
  it('allows public menu and legacy wall paths', () => {
    expect(getSafeAuthReturnPath('/m/warung-sunda')).toBe('/m/warung-sunda')
    expect(getSafeAuthReturnPath('/l/venue')).toBe('/l/venue')
  })

  it('rejects open redirects and non-guest paths', () => {
    expect(getSafeAuthReturnPath('https://evil.example/m/x')).toBeNull()
    expect(getSafeAuthReturnPath('//evil.example')).toBeNull()
    expect(getSafeAuthReturnPath('/advisor')).toBeNull()
    expect(getSafeAuthReturnPath('/home')).toBeNull()
    expect(getSafeAuthReturnPath(null)).toBeNull()
  })
})

describe('buildAuthContinueUrl / buildLoginUrl', () => {
  it('appends a safe next param', () => {
    expect(buildAuthContinueUrl('/m/cafe')).toBe(`/continue?${AUTH_RETURN_TO_QUERY}=%2Fm%2Fcafe`)
    expect(buildLoginUrl('/m/cafe')).toBe(`/login?${AUTH_RETURN_TO_QUERY}=%2Fm%2Fcafe`)
  })

  it('omits next when unsafe', () => {
    expect(buildAuthContinueUrl('/advisor')).toBe('/continue')
    expect(buildLoginUrl(null)).toBe('/login')
  })
})
