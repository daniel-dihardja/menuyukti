import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    connection: vi.fn(async () => undefined),
  }
})

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'GraphQLRequestError'
    }
  },
}))

describe('/api/public-menu/point-earn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    } as Awaited<ReturnType<typeof auth>>)

    const { POST } = await import('@/app/api/public-menu/point-earn/route')
    const response = await POST(
      new Request('http://localhost:3000/api/public-menu/point-earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: 1 }),
      }),
    )
    expect(response.status).toBe(401)
  })

  it('records open_menu_qr earn event for signed-in guest', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_guest_1',
    } as Awaited<ReturnType<typeof auth>>)

    const { graphqlQuery } = await import('@/lib/graphql/client')
    vi.mocked(graphqlQuery).mockResolvedValue({
      recordPointEarnEvent: { awarded: true, balance: 10 },
    })

    const { POST } = await import('@/app/api/public-menu/point-earn/route')
    const response = await POST(
      new Request('http://localhost:3000/api/public-menu/point-earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: 42, actionKey: 'open_menu_qr' }),
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ awarded: true, balance: 10 })
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.any(String),
      { locationId: 42, actionKey: 'open_menu_qr' },
      'user_guest_1',
      'RecordPointEarnEvent',
    )
  })
})
