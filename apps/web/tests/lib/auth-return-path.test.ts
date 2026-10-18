import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_RETURN_TO_QUERY,
  buildAuthContinueUrl,
  buildLoginUrl,
  getSafeAuthReturnPath,
  toAbsoluteAppUrl,
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

  it('falls back to /home when no safe return path', () => {
    expect(buildAuthContinueUrl('/advisor')).toBe('/home')
    expect(buildLoginUrl(null)).toBe('/login')
  })
})

describe('toAbsoluteAppUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('leaves absolute URLs unchanged', () => {
    expect(toAbsoluteAppUrl('https://menuyukti.com/home')).toBe('https://menuyukti.com/home')
  })

  it('returns relative paths unchanged when window is undefined (SSR)', () => {
    expect(toAbsoluteAppUrl('/sso-callback')).toBe('/sso-callback')
  })

  it('resolves relative paths against window.location.origin', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
    expect(toAbsoluteAppUrl('/sso-callback')).toBe('http://localhost:3000/sso-callback')
    expect(toAbsoluteAppUrl('/home')).toBe('http://localhost:3000/home')
  })
})
