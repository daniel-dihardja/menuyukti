import { describe, expect, it } from 'vitest'

import { isCaptchaOauthError } from '@/lib/start-google-oauth'

describe('isCaptchaOauthError', () => {
  it('detects captcha_unavailable code', () => {
    expect(isCaptchaOauthError({ code: 'captcha_unavailable' })).toBe(true)
  })

  it('detects protect_check_required in errors[]', () => {
    expect(isCaptchaOauthError({ errors: [{ code: 'protect_check_required' }] })).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isCaptchaOauthError({ code: 'session_exists' })).toBe(false)
    expect(isCaptchaOauthError(null)).toBe(false)
  })
})
