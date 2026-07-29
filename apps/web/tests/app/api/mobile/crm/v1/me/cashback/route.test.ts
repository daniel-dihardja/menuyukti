import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET, OPTIONS } from '@/app/api/mobile/crm/v1/me/cashback/route'

describe('/api/mobile/crm/v1/me/cashback', () => {
  beforeEach(() => {
    process.env.GRAPHQL_ENDPOINT = 'http://127.0.0.1:8000/graphql'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('OPTIONS allows GET for mobile CORS', async () => {
    const response = await OPTIONS(
      new Request('http://localhost:3000/api/mobile/crm/v1/me/cashback', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:8081' },
      }),
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })

  it('returns 401 when Authorization is missing', async () => {
    const response = await GET(
      new Request('http://localhost:3000/api/mobile/crm/v1/me/cashback', {
        method: 'GET',
      }),
    )
    expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('proxies GET with Authorization Bearer header', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          balance: 0,
          entries: [],
          config: { thresholdAmount: 0, percent: 0 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const response = await GET(
      new Request('http://localhost:3000/api/mobile/crm/v1/me/cashback', {
        method: 'GET',
        headers: { Authorization: 'Bearer access-jwt' },
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      balance: 0,
      entries: [],
      config: { thresholdAmount: 0, percent: 0 },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/crm/v1/me/cashback',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer access-jwt' }),
      }),
    )
  })

  it('forwards upstream 401', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Device revoked' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await GET(
      new Request('http://localhost:3000/api/mobile/crm/v1/me/cashback', {
        method: 'GET',
        headers: { Authorization: 'Bearer access-jwt' },
      }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: 'Device revoked' })
  })
})
