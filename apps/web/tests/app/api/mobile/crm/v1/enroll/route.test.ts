import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OPTIONS, POST } from '@/app/api/mobile/crm/v1/enroll/route'

const validBody = {
  token: 'enroll-token-abc',
  appId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  publicKey: 'abcd1234',
  platform: 'ios',
}

describe('POST /api/mobile/crm/v1/enroll', () => {
  beforeEach(() => {
    process.env.GRAPHQL_ENDPOINT = 'http://127.0.0.1:8000/graphql'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('proxies success 201 from upstream', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ customerId: 'cust-1', deviceId: 'dev-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:8081',
        },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ customerId: 'cust-1', deviceId: 'dev-1' })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/crm/v1/enroll',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('passthrough upstream 401', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid enrollment token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: 'Invalid enrollment token' })
  })

  it('passthrough upstream 400', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'token is required' })
  })

  it('returns 502 when upstream is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ message: 'Could not reach enrollment service' })
  })

  it('returns 400 for invalid body without calling upstream', async () => {
    const fetchMock = vi.mocked(fetch)

    const response = await POST(
      new Request('http://localhost:3000/api/mobile/crm/v1/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validBody, appId: 'bad' }),
      }),
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('OPTIONS /api/mobile/crm/v1/enroll', () => {
  it('returns CORS preflight for allowed Expo origin', async () => {
    const response = await OPTIONS(
      new Request('http://localhost:3000/api/mobile/crm/v1/enroll', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:8081' },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
