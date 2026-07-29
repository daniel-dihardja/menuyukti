import { describe, expect, it } from 'vitest'

import { mobileEnrollBodySchema } from '@/app/api/mobile/crm/v1/enroll/schema'

const VALID_PUBLIC_KEY = 'a'.repeat(64)

const validBody = {
  token: 'enroll-token-abc',
  appId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  publicKey: VALID_PUBLIC_KEY,
  platform: 'ios',
}

describe('mobileEnrollBodySchema', () => {
  it('accepts a valid enroll body', () => {
    const parsed = mobileEnrollBodySchema.safeParse(validBody)
    expect(parsed.success).toBe(true)
  })

  it('accepts optional E.164 phone', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      phoneE164: '+15551234567',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid appId', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      appId: 'not-a-uuid',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects missing token', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      token: '   ',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects platform longer than 64 chars', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      platform: 'x'.repeat(65),
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects non-hex publicKey', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      publicKey: 'not-a-hex-key',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects publicKey with wrong length', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      publicKey: 'ab'.repeat(20),
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects invalid phoneE164', () => {
    const parsed = mobileEnrollBodySchema.safeParse({
      ...validBody,
      phoneE164: '555-1234',
    })
    expect(parsed.success).toBe(false)
  })
})
