import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    connection: vi.fn(async () => undefined),
  }
})

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/graphql/client', () => ({
  GraphQLRequestError: class GraphQLRequestError extends Error {
    codes: string[]
    constructor(message: string, codes: string[] = []) {
      super(message)
      this.codes = codes
    }
  },
  graphqlQuery: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { DELETE, GET } from '@/app/api/locations/[id]/advisor-memory/route'

describe('/api/locations/[id]/advisor-memory', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(graphqlQuery).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    } as Awaited<ReturnType<typeof auth>>)

    const response = await GET(new Request('http://localhost/api/locations/3/advisor-memory'), {
      params: Promise.resolve({ id: '3' }),
    })

    expect(response.status).toBe(401)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('GET returns advisor memory for the location', async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_1',
    } as Awaited<ReturnType<typeof auth>>)
    vi.mocked(graphqlQuery).mockResolvedValue({
      location: {
        id: '3',
        advisorMemory: {
          locationId: 3,
          content: 'Prefer stories over reels',
          updatedAt: '2026-10-29T12:00:00Z',
        },
      },
    })

    const response = await GET(new Request('http://localhost/api/locations/3/advisor-memory'), {
      params: Promise.resolve({ id: '3' }),
    })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.advisorMemory.content).toBe('Prefer stories over reels')
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('advisorMemory'),
      { id: '3' },
      'user_1',
      'LocationAdvisorMemory',
    )
  })

  it('DELETE clears memory with empty content and does not touch quickProfile', async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_1',
    } as Awaited<ReturnType<typeof auth>>)
    vi.mocked(graphqlQuery).mockResolvedValue({
      updateLocationAdvisorMemory: {
        locationId: 3,
        content: '',
        updatedAt: null,
      },
    })

    const response = await DELETE(
      new Request('http://localhost/api/locations/3/advisor-memory', { method: 'DELETE' }),
      { params: Promise.resolve({ id: '3' }) },
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.advisorMemory.content).toBe('')
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('updateLocationAdvisorMemory'),
      { locationId: 3, content: '' },
      'user_1',
      'UpdateLocationAdvisorMemory',
    )
    const [document] = vi.mocked(graphqlQuery).mock.calls[0]!
    expect(document).not.toContain('quickProfile')
    expect(document).not.toContain('updateLocationManualBriefInput')
  })
})
