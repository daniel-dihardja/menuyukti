import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/mobile/crm/v1/auth/refresh/route'

describe('POST /api/mobile/crm/v1/auth/refresh', () => {
  beforeEach(() => {
    process.env.GRAPHQL_ENDPOINT = 'http://127.0.0.1:8000/graphql'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('proxies success and rotated refresh', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'jwt',
          expiresAt: '2026-07-28T12:00:00Z',
          refreshToken: 'new-refresh',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'old-refresh' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ refreshToken: 'new-refresh' })
  })

  it('passthrough 401', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid refresh token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'bad' }),
      }),
    )
    expect(response.status).toBe(401)
  })
})
