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
import { POST } from '@/app/api/staff/dev-data/route'

describe('POST /api/staff/dev-data', () => {
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
      new Request('http://localhost/api/staff/dev-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClerkUserId: 'user_1', scope: 'inventar' }),
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
      new Request('http://localhost/api/staff/dev-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClerkUserId: 'user_1', scope: 'inventar' }),
      }),
    )

    expect(response.status).toBe(403)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('ingests seed data on success', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({ ok: true, userId: 'user_admin' })
    vi.mocked(graphqlQuery).mockResolvedValue({
      ingestDevData: {
        scope: 'clear-inventar',
        clerkUserId: 'user_1',
        workspaceId: '42',
        createdPrimary: false,
        inventarCleared: true,
        inventarLocationId: '7',
        inventarLocationName: 'Warung Sunda Lembur',
        analyticsLocationId: '8',
        analyticsLocationName: 'Kaffeestube Mitte',
        inventarCatalogItems: null,
        inventarStockRows: null,
        inventarMovements: null,
        inventarMenuCategories: null,
        inventarMenuItems: null,
        inventarClearedPosOrders: null,
        analyticsRunId: null,
        analyticsOrderRows: null,
        analyticsLocationCogs: null,
        analyticsDeletedSeedRuns: null,
        analyticsPosSystem: null,
        analyticsMenuCategories: null,
        analyticsMenuItems: null,
        analyticsClearedPosOrders: null,
        notes: [],
      },
    })

    const response = await POST(
      new Request('http://localhost/api/staff/dev-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClerkUserId: 'user_1', scope: 'clear-inventar' }),
      }),
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.inventarCleared).toBe(true)
    expect(json.workspaceId).toBe('42')
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('ingestDevData'),
      { targetClerkUserId: 'user_1', scope: 'clear-inventar' },
      'user_admin',
    )
  })
})
