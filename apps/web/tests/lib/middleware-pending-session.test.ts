import { describe, expect, it } from 'vitest'

import { shouldRedirectPendingSession } from '@/lib/middleware-pending-session'

describe('shouldRedirectPendingSession', () => {
  it('does not redirect active sessions on protected routes', () => {
    expect(shouldRedirectPendingSession('/advisor', 'active')).toBe(false)
  })

  it('does not redirect pending sessions on /login', () => {
    expect(shouldRedirectPendingSession('/login', 'pending')).toBe(false)
  })

  it('does not redirect pending sessions on nested login paths', () => {
    expect(shouldRedirectPendingSession('/login/factor-one', 'pending')).toBe(false)
  })

  it('does not redirect pending sessions on /sign-up or /sso-callback', () => {
    expect(shouldRedirectPendingSession('/sign-up', 'pending')).toBe(false)
    expect(shouldRedirectPendingSession('/sso-callback', 'pending')).toBe(false)
  })

  it('redirects pending sessions on protected routes to login via middleware', () => {
    expect(shouldRedirectPendingSession('/advisor', 'pending')).toBe(true)
    expect(shouldRedirectPendingSession('/advisor/abc', 'pending')).toBe(true)
    expect(shouldRedirectPendingSession('/dashboard', 'pending')).toBe(true)
    expect(shouldRedirectPendingSession('/agent', 'pending')).toBe(true)
  })

  it('does not redirect pending sessions on public routes', () => {
    expect(shouldRedirectPendingSession('/', 'pending')).toBe(false)
    expect(shouldRedirectPendingSession('/shop', 'pending')).toBe(false)
  })

  it('does not redirect when session status is undefined', () => {
    expect(shouldRedirectPendingSession('/advisor', undefined)).toBe(false)
  })
})
