import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/mobile/crm/v1/auth/verify/route'

const validBody = {
  deviceId: '11111111-1111-4111-8111-111111111111',
  challengeId: '22222222-2222-4222-8222-222222222222',
  signature: 'ab'.repeat(64),
}

describe('POST /api/mobile/crm/v1/auth/verify', () => {
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
      new Response(JSON.stringify({ accessToken: 'jwt', expiresAt: '2026-07-28T12:00:00Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accessToken: 'jwt', expiresAt: '2026-07-28T12:00:00Z' })
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/crm/v1/auth/verify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns 400 for bad signature length', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validBody, signature: 'short' }),
      }),
    )
    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
