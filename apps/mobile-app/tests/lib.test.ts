import { describe, expect, it } from 'vitest'

import { parseEnrollInput } from '../lib/enroll'
import { bytesToHex, hexToBytes } from '../lib/hex'
import {
  parseStoredProfile,
  parseStoredSession,
  serializeProfile,
  serializeSession,
} from '../lib/sessionCodec'

describe('parseEnrollInput', () => {
  it('returns empty payload for blank input', () => {
    expect(parseEnrollInput('   ')).toEqual({
      token: '',
      appId: null,
      isDeepLink: false,
    })
  })

  it('treats plain strings as raw tokens', () => {
    expect(parseEnrollInput('abc-token')).toEqual({
      token: 'abc-token',
      appId: null,
      isDeepLink: false,
    })
  })

  it('parses menuyukti enroll deep links', () => {
    expect(
      parseEnrollInput('menuyukti://enroll?token=tok123&app=11111111-1111-1111-1111-111111111111'),
    ).toEqual({
      token: 'tok123',
      appId: '11111111-1111-1111-1111-111111111111',
      isDeepLink: true,
    })
  })

  it('handles deep links missing app', () => {
    expect(parseEnrollInput('menuyukti://enroll?token=only')).toEqual({
      token: 'only',
      appId: null,
      isDeepLink: true,
    })
  })
})

describe('hex helpers', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 15, 16, 255])
    expect(bytesToHex(bytes)).toBe('000f10ff')
    expect(Array.from(hexToBytes('000f10ff'))).toEqual([0, 15, 16, 255])
  })

  it('rejects odd-length hex', () => {
    expect(() => hexToBytes('abc')).toThrow('Invalid hex length')
  })
})

describe('session storage parsers', () => {
  it('serializes and parses a session', () => {
    const session = {
      customerId: 'cust-1',
      deviceId: 'dev-1',
      appId: 'app-1',
    }
    expect(parseStoredSession(serializeSession(session))).toEqual(session)
  })

  it('rejects invalid session JSON', () => {
    expect(parseStoredSession(null)).toBeNull()
    expect(parseStoredSession('{}')).toBeNull()
    expect(parseStoredSession('not-json')).toBeNull()
    expect(parseStoredSession(JSON.stringify({ customerId: 'a' }))).toBeNull()
  })

  it('serializes and parses a profile', () => {
    const profile = { givenName: 'Alex', familyName: 'M', phoneE164: '+491701234567' }
    expect(parseStoredProfile(serializeProfile(profile))).toEqual(profile)
  })

  it('fills missing profile fields', () => {
    expect(parseStoredProfile(JSON.stringify({ givenName: 'A' }))).toEqual({
      givenName: 'A',
      familyName: '',
      phoneE164: '',
    })
  })
})
