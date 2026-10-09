import { describe, expect, it } from 'vitest'

import {
  AUTH_RETURN_TO_QUERY,
  buildAuthContinueUrl,
  buildLoginUrl,
  getSafeAuthReturnPath,
} from '@/lib/auth-return-path'

describe('getSafeAuthReturnPath', () => {
  it('allows public location hub, menu, prediction, and legacy paths', () => {
    expect(getSafeAuthReturnPath('/warung-sunda')).toBe('/warung-sunda')
    expect(getSafeAuthReturnPath('/warung-sunda/menu')).toBe('/warung-sunda/menu')
    expect(getSafeAuthReturnPath('/cafe/menu/t/12')).toBe('/cafe/menu/t/12')
    expect(getSafeAuthReturnPath('/cafe/pick-and-win')).toBe('/cafe/pick-and-win')
    expect(getSafeAuthReturnPath('/cafe/voting')).toBe('/cafe/voting')
    expect(getSafeAuthReturnPath('/m/warung-sunda')).toBe('/m/warung-sunda')
    expect(getSafeAuthReturnPath('/m/cafe/t/12')).toBe('/m/cafe/t/12')
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
  it('returns the guest surface path directly (avoids /continue → /login race)', () => {
    expect(buildAuthContinueUrl('/cafe/menu')).toBe('/cafe/menu')
    expect(buildAuthContinueUrl('/cafe/menu/t/12')).toBe('/cafe/menu/t/12')
    expect(buildAuthContinueUrl('/cafe/pick-and-win')).toBe('/cafe/pick-and-win')
    expect(buildLoginUrl('/cafe/menu')).toBe(`/login?${AUTH_RETURN_TO_QUERY}=%2Fcafe%2Fmenu`)
    expect(buildLoginUrl('/cafe/menu/t/12')).toBe(
      `/login?${AUTH_RETURN_TO_QUERY}=${encodeURIComponent('/cafe/menu/t/12')}`,
    )
  })

  it('falls back to /continue when no safe return path', () => {
    expect(buildAuthContinueUrl('/advisor')).toBe('/continue')
    expect(buildLoginUrl(null)).toBe('/login')
  })
})
