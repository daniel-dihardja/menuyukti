import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crmApiBaseUrl, crmEnrollUrl, enrollDevice, parseEnrollInput } from '../lib/enroll'
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

describe('crm BFF URLs', () => {
  const prev = process.env.EXPO_PUBLIC_CRM_API_URL

  afterEach(() => {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_CRM_API_URL
    else process.env.EXPO_PUBLIC_CRM_API_URL = prev
  })

  it('defaults to local Next.js origin', () => {
    delete process.env.EXPO_PUBLIC_CRM_API_URL
    expect(crmApiBaseUrl()).toBe('http://localhost:3000')
    expect(crmEnrollUrl()).toBe('http://localhost:3000/api/mobile/crm/v1/enroll')
  })

  it('strips trailing slash from env base URL', () => {
    process.env.EXPO_PUBLIC_CRM_API_URL = 'https://app.example.com/'
    expect(crmApiBaseUrl()).toBe('https://app.example.com')
    expect(crmEnrollUrl()).toBe('https://app.example.com/api/mobile/crm/v1/enroll')
  })
})

describe('enrollDevice', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_CRM_API_URL = 'http://localhost:3000'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts to the Next.js enroll BFF and returns ids plus refreshToken', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ customerId: 'c1', deviceId: 'd1', refreshToken: 'rt-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await enrollDevice({
      token: 'tok',
      appId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      publicKey: 'pk',
      platform: 'ios',
    })

    expect(result).toEqual({ customerId: 'c1', deviceId: 'd1', refreshToken: 'rt-1' })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/mobile/crm/v1/enroll',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces upstream error messages', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid enrollment token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      enrollDevice({
        token: 'bad',
        appId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        publicKey: 'pk',
        platform: 'ios',
      }),
    ).rejects.toThrow('Invalid enrollment token')
  })

  it('rejects incomplete success payloads', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ customerId: 'c1', deviceId: 'd1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      enrollDevice({
        token: 'tok',
        appId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        publicKey: 'pk',
        platform: 'ios',
      }),
    ).rejects.toThrow(/missing customerId, deviceId, or refreshToken/)
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
