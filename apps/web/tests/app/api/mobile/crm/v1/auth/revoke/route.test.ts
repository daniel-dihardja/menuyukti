import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/mobile/crm/v1/auth/revoke/route'

describe('POST /api/mobile/crm/v1/auth/revoke', () => {
  beforeEach(() => {
    process.env.GRAPHQL_ENDPOINT = 'http://127.0.0.1:8000/graphql'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('proxies revoke with refreshToken', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'rt' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/crm/v1/auth/revoke',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('forwards Authorization Bearer header', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-jwt',
        },
        body: JSON.stringify({}),
      }),
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/crm/v1/auth/revoke',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-jwt' }),
      }),
    )
  })

  it('returns 400 when neither refresh nor bearer provided', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
