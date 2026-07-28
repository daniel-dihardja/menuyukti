import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OPTIONS, POST } from '@/app/api/mobile/crm/v1/auth/challenge/route'

const deviceId = '11111111-1111-4111-8111-111111111111'

describe('POST /api/mobile/crm/v1/auth/challenge', () => {
  beforeEach(() => {
    process.env.GRAPHQL_ENDPOINT = 'http://127.0.0.1:8000/graphql'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('proxies success from upstream', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          challengeId: '22222222-2222-4222-8222-222222222222',
          nonce: 'nonce-abc',
          expiresAt: '2026-07-28T12:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' },
        body: JSON.stringify({ deviceId }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ nonce: 'nonce-abc' })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081')
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/crm/v1/auth/challenge',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('passthrough upstream 401', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Device revoked' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: 'Device revoked' })
  })

  it('returns 400 for invalid deviceId without calling upstream', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'bad' }),
      }),
    )
    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('OPTIONS challenge', () => {
  it('allows Authorization header in preflight', async () => {
    const response = await OPTIONS(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/challenge', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:8081' },
      }),
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })
})
