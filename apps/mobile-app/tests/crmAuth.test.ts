import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, setAccessToken } from '../lib/accessToken'
import {
  accessTokenExpiresAt,
  challengeAndVerify,
  ensureAccessToken,
  refreshAccessToken,
} from '../lib/crmAuth'
import { crmFetch } from '../lib/crmClient'
import { bytesToHex } from '../lib/hex'
import { clearAuthTokens, saveRefreshToken } from '../lib/tokenStorage'

ed.hashes.sha512 = sha512
ed.hashes.sha512Async = (m: Uint8Array) => Promise.resolve(sha512(m))

const { store, signChallengeNonceMock } = vi.hoisted(() => {
  const store = new Map<string, string>()
  return {
    store,
    signChallengeNonceMock: vi.fn(async (nonce: string) => {
      const secretKey = ed.utils.randomSecretKey()
      const sig = await ed.signAsync(new TextEncoder().encode(nonce), secretKey)
      return bytesToHex(sig)
    }),
  }
})

vi.mock('../lib/secureStorage', () => ({
  getSecureItem: vi.fn(async (key: string) => store.get(key) ?? null),
  setSecureItem: vi.fn(async (key: string, value: string) => {
    store.set(key, value)
  }),
  deleteSecureItem: vi.fn(async (key: string) => {
    store.delete(key)
  }),
}))

vi.mock('../lib/keys', () => ({
  signChallengeNonce: signChallengeNonceMock,
}))

function makeJwt(expSecFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecFromNow }),
  ).toString('base64url')
  return `${header}.${payload}.sig`
}

describe('accessTokenExpiresAt', () => {
  it('reads exp from JWT payload', () => {
    const token = makeJwt(120)
    const exp = accessTokenExpiresAt(token)
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
})

describe('crmAuth client', () => {
  beforeEach(async () => {
    process.env.EXPO_PUBLIC_CRM_API_URL = 'http://localhost:3000'
    vi.stubGlobal('fetch', vi.fn())
    store.clear()
    setAccessToken(null)
    await clearAuthTokens()
    signChallengeNonceMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('challengeAndVerify stores access token', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            challengeId: '22222222-2222-4222-8222-222222222222',
            nonce: 'nonce-1',
            expiresAt: '2099-01-01T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ accessToken: makeJwt(900), expiresAt: '2099-01-01T00:00:00Z' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const token = await challengeAndVerify('11111111-1111-4111-8111-111111111111')
    expect(token).toBeTruthy()
    expect(getAccessToken()).toBe(token)
    expect(signChallengeNonceMock).toHaveBeenCalledWith('nonce-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/mobile/crm/v1/auth/challenge',
      expect.anything(),
    )
  })

  it('refreshAccessToken rotates refresh and stores access', async () => {
    await saveRefreshToken('old-refresh')
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: makeJwt(900),
          expiresAt: '2099-01-01T00:00:00Z',
          refreshToken: 'new-refresh',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const access = await refreshAccessToken()
    expect(getAccessToken()).toBe(access)
    expect(store.get('crm_refresh_token_v1')).toBe('new-refresh')
  })

  it('ensureAccessToken returns fresh memory token without network', async () => {
    const jwt = makeJwt(900)
    setAccessToken(jwt)
    const token = await ensureAccessToken('11111111-1111-4111-8111-111111111111')
    expect(token).toBe(jwt)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('crmFetch retries once on 401', async () => {
    await saveRefreshToken('rt')
    const initial = makeJwt(900)
    const fresh = makeJwt(900)
    setAccessToken(initial)

    const fetchMock = vi.mocked(fetch)
    fetchMock
      // first authenticated request
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      // forceRefresh → refreshAccessToken
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: fresh,
            expiresAt: '2099-01-01T00:00:00Z',
            refreshToken: 'rt2',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      // retry authenticated request
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const response = await crmFetch(
      '/auth/challenge',
      {
        method: 'POST',
        body: JSON.stringify({ deviceId: '11111111-1111-4111-8111-111111111111' }),
      },
      { deviceId: '11111111-1111-4111-8111-111111111111' },
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
