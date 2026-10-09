import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    connection: vi.fn(async () => undefined),
  }
})

vi.mock('@/lib/menuyukti-admin-api', () => ({
  requireMenuyuktiAdminApi: vi.fn(),
}))

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: vi.fn(),
}))

import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { graphqlQuery } from '@/lib/graphql/client'
import { POST } from '@/app/api/staff/clear-service-data/route'

describe('POST /api/staff/clear-service-data', () => {
  beforeEach(() => {
    vi.mocked(requireMenuyuktiAdminApi).mockReset()
    vi.mocked(graphqlQuery).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(
      new Request('http://localhost/api/staff/clear-service-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClerkUserId: 'user_1', serviceKey: 'pick_and_win' }),
      }),
    )

    expect(response.status).toBe(401)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('returns 403 when authenticated but not admin', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })

    const response = await POST(
      new Request('http://localhost/api/staff/clear-service-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClerkUserId: 'user_1', serviceKey: 'pick_and_win' }),
      }),
    )

    expect(response.status).toBe(403)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('clears service data on success', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({ ok: true, userId: 'user_admin' })
    vi.mocked(graphqlQuery).mockResolvedValue({
      clearWorkspaceServiceData: {
        serviceKey: 'pick_and_win',
        clerkUserId: 'user_1',
        workspaceId: '42',
        locationIds: ['7'],
        predictionsDeleted: 3,
        votingsDeleted: 0,
        ledgerEntriesDeleted: 2,
        earnRulesDeleted: 0,
        posOrdersDeleted: 0,
        menuCategoriesCleared: 0,
        notes: [],
      },
    })

    const response = await POST(
      new Request('http://localhost/api/staff/clear-service-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClerkUserId: 'user_1', serviceKey: 'pick_and_win' }),
      }),
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.predictionsDeleted).toBe(3)
    expect(json.workspaceId).toBe('42')
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('clearWorkspaceServiceData'),
      { targetClerkUserId: 'user_1', serviceKey: 'pick_and_win' },
      'user_admin',
    )
  })
})
