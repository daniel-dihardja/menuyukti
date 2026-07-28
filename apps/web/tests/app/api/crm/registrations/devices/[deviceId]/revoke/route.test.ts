import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/authenticated-api', () => ({
  requireAuthenticatedApi: vi.fn(),
}))

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: vi.fn(),
}))

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import { POST } from '@/app/api/crm/registrations/devices/[deviceId]/revoke/route'
import { NextResponse } from 'next/server'

const DEVICE_ID = '22222222-2222-4222-8222-222222222222'

describe('POST /api/crm/registrations/devices/[deviceId]/revoke', () => {
  beforeEach(() => {
    vi.mocked(requireAuthenticatedApi).mockReset()
    vi.mocked(graphqlQuery).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuthenticatedApi).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(
      new Request('http://localhost/api/crm/registrations/devices/' + DEVICE_ID + '/revoke', {
        method: 'POST',
      }),
      { params: Promise.resolve({ deviceId: DEVICE_ID }) },
    )

    expect(response.status).toBe(401)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('revokes device on success', async () => {
    vi.mocked(requireAuthenticatedApi).mockResolvedValue({ ok: true, userId: 'user_1' })
    vi.mocked(graphqlQuery).mockResolvedValue({
      revokeCrmDevice: {
        id: DEVICE_ID,
        platform: 'ios',
        label: null,
        createdAt: '2026-01-01T00:00:00Z',
        lastSeenAt: null,
        revokedAt: '2026-07-28T12:00:00Z',
      },
    })

    const response = await POST(
      new Request('http://localhost/api/crm/registrations/devices/' + DEVICE_ID + '/revoke', {
        method: 'POST',
      }),
      { params: Promise.resolve({ deviceId: DEVICE_ID }) },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.device.id).toBe(DEVICE_ID)
    expect(body.device.revokedAt).toBeTruthy()
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('revokeCrmDevice'),
      { deviceId: DEVICE_ID },
      'user_1',
    )
  })

  it('returns 400 for invalid deviceId', async () => {
    vi.mocked(requireAuthenticatedApi).mockResolvedValue({ ok: true, userId: 'user_1' })

    const response = await POST(
      new Request('http://localhost/api/crm/registrations/devices/not-a-uuid/revoke', {
        method: 'POST',
      }),
      { params: Promise.resolve({ deviceId: 'not-a-uuid' }) },
    )

    expect(response.status).toBe(400)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })
})
