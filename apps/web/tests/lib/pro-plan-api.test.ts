import { describe, expect, it, vi, afterEach } from 'vitest'

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

vi.mock('@/lib/workspace-plan-server', () => ({
  getWorkspacePlanForUser: vi.fn(),
}))

describe('requireProPlanApi', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    const { requireProPlanApi } = await import('@/lib/pro-plan-api')

    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    } as Awaited<ReturnType<typeof auth>>)

    const result = await requireProPlanApi()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })

  it('returns 403 for free-plan users', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    const { getWorkspacePlanForUser } = await import('@/lib/workspace-plan-server')
    const { requireProPlanApi } = await import('@/lib/pro-plan-api')

    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_free',
    } as Awaited<ReturnType<typeof auth>>)
    vi.mocked(getWorkspacePlanForUser).mockResolvedValue({
      plan: 'free',
      hasWorkspace: true,
      workspaceId: 'ws_1',
    })

    const result = await requireProPlanApi()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
    }
  })

  it('allows pro-plan users', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    const { getWorkspacePlanForUser } = await import('@/lib/workspace-plan-server')
    const { requireProPlanApi } = await import('@/lib/pro-plan-api')

    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_pro',
    } as Awaited<ReturnType<typeof auth>>)
    vi.mocked(getWorkspacePlanForUser).mockResolvedValue({
      plan: 'pro',
      hasWorkspace: true,
      workspaceId: 'ws_2',
    })

    const result = await requireProPlanApi()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.userId).toBe('user_pro')
    }
  })
})
