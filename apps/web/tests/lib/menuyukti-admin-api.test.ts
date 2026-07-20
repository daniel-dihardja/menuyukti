import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { requireMenuyuktiAdminOrInternalApi } from '@/lib/menuyukti-admin-api'

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

vi.mock('@/lib/menuyukti-role-server', () => ({
  resolveMenuyuktiRole: vi.fn(),
}))

vi.mock('@/lib/menuyukti-role', () => ({
  isMenuyuktiAdmin: vi.fn((role: string | null) => role === 'admin'),
}))

describe('requireMenuyuktiAdminOrInternalApi', () => {
  const originalKey = process.env.GRAPHQL_INTERNAL_API_KEY

  beforeEach(() => {
    process.env.GRAPHQL_INTERNAL_API_KEY = 'test-internal-key'
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GRAPHQL_INTERNAL_API_KEY
    } else {
      process.env.GRAPHQL_INTERNAL_API_KEY = originalKey
    }
    vi.clearAllMocks()
  })

  it('accepts matching internal API key and X-User-Id', async () => {
    const req = new Request('http://localhost/api/posts/generate', {
      method: 'POST',
      headers: {
        'X-Internal-Api-Key': 'test-internal-key',
        'X-User-Id': 'user_abc',
      },
    })
    const result = await requireMenuyuktiAdminOrInternalApi(req)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.userId).toBe('user_abc')
    }
  })

  it('rejects mismatched internal API key and falls through to Clerk', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    } as Awaited<ReturnType<typeof auth>>)

    const req = new Request('http://localhost/api/posts/generate', {
      method: 'POST',
      headers: {
        'X-Internal-Api-Key': 'wrong-key',
        'X-User-Id': 'user_abc',
      },
    })
    const result = await requireMenuyuktiAdminOrInternalApi(req)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })
})
