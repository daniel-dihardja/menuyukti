import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/menuyukti-admin-api', () => ({
  requireMenuyuktiAdminApi: vi.fn(),
}))

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: vi.fn(),
}))

import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { graphqlQuery } from '@/lib/graphql/client'
import { GET } from '@/app/api/crm/registrations/[id]/route'
import { NextResponse } from 'next/server'

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111'

describe('GET /api/crm/registrations/[id]', () => {
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

    const response = await GET(
      new Request('http://localhost/api/crm/registrations/' + CUSTOMER_ID),
      {
        params: Promise.resolve({ id: CUSTOMER_ID }),
      },
    )

    expect(response.status).toBe(401)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('returns 403 when authenticated but not admin', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })

    const response = await GET(
      new Request('http://localhost/api/crm/registrations/' + CUSTOMER_ID),
      {
        params: Promise.resolve({ id: CUSTOMER_ID }),
      },
    )

    expect(response.status).toBe(403)
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('returns customer detail on success', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({ ok: true, userId: 'user_1' })
    vi.mocked(graphqlQuery).mockResolvedValue({
      crmCustomer: {
        id: CUSTOMER_ID,
        appId: 1,
        phoneMasked: '+49***67',
        givenName: 'Ada',
        familyName: null,
        createdAt: '2026-01-01T00:00:00Z',
        deviceCount: 1,
        lastSeenAt: null,
        status: 'ACTIVE',
        cashbackBalance: 0,
        cashbackEntries: [],
        devices: [],
      },
    })

    const response = await GET(
      new Request('http://localhost/api/crm/registrations/' + CUSTOMER_ID),
      {
        params: Promise.resolve({ id: CUSTOMER_ID }),
      },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.customer.id).toBe(CUSTOMER_ID)
    expect(body.customer.phoneMasked).toBe('+49***67')
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('crmCustomer'),
      { id: CUSTOMER_ID },
      'user_1',
    )
  })

  it('returns 404 when customer missing', async () => {
    vi.mocked(requireMenuyuktiAdminApi).mockResolvedValue({ ok: true, userId: 'user_1' })
    vi.mocked(graphqlQuery).mockResolvedValue({ crmCustomer: null })

    const response = await GET(
      new Request('http://localhost/api/crm/registrations/' + CUSTOMER_ID),
      {
        params: Promise.resolve({ id: CUSTOMER_ID }),
      },
    )

    expect(response.status).toBe(404)
  })
})
