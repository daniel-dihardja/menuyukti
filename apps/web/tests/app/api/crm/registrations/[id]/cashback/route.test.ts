import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/crm/registrations/[id]/cashback/route'

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111'

vi.mock('@/lib/authenticated-api', () => ({
  requireAuthenticatedApi: vi.fn(async () => ({ ok: true as const, userId: 'user_test' })),
}))

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: vi.fn(),
}))

describe('POST /api/crm/registrations/[id]/cashback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('awards cashback from paymentAmount via GraphQL', async () => {
    const { graphqlQuery } = await import('@/lib/graphql/client')
    vi.mocked(graphqlQuery).mockResolvedValue({
      awardCrmCashback: {
        id: '22222222-2222-4222-8222-222222222222',
        customerId: CUSTOMER_ID,
        amount: 10000,
        paymentAmount: 100000,
        cashbackPercent: 10,
        label: 'Visit',
        createdAt: '2026-07-28T12:00:00Z',
      },
    })

    const response = await POST(
      new Request(`http://localhost/api/crm/registrations/${CUSTOMER_ID}/cashback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount: 100000, label: 'Visit' }),
      }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.entry.amount).toBe(10000)
    expect(json.entry.paymentAmount).toBe(100000)
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('awardCrmCashback'),
      {
        customerId: CUSTOMER_ID,
        paymentAmount: 100000,
        redeemAmount: null,
        label: 'Visit',
      },
      'user_test',
    )
  })

  it('redeems cashback via redeemAmount', async () => {
    const { graphqlQuery } = await import('@/lib/graphql/client')
    vi.mocked(graphqlQuery).mockResolvedValue({
      awardCrmCashback: {
        id: '33333333-3333-4333-8333-333333333333',
        customerId: CUSTOMER_ID,
        amount: -15000,
        paymentAmount: null,
        cashbackPercent: null,
        label: 'Redeemed',
        createdAt: '2026-07-28T12:00:00Z',
      },
    })

    const response = await POST(
      new Request(`http://localhost/api/crm/registrations/${CUSTOMER_ID}/cashback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redeemAmount: 15000, label: 'Redeemed' }),
      }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ entry: { amount: -15000 } })
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('awardCrmCashback'),
      {
        customerId: CUSTOMER_ID,
        paymentAmount: null,
        redeemAmount: 15000,
        label: 'Redeemed',
      },
      'user_test',
    )
  })

  it('rejects missing mode', async () => {
    const response = await POST(
      new Request(`http://localhost/api/crm/registrations/${CUSTOMER_ID}/cashback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Nope' }),
      }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    )
    expect(response.status).toBe(400)
  })

  it('rejects both payment and redeem', async () => {
    const response = await POST(
      new Request(`http://localhost/api/crm/registrations/${CUSTOMER_ID}/cashback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount: 1000, redeemAmount: 500 }),
      }),
      { params: Promise.resolve({ id: CUSTOMER_ID }) },
    )
    expect(response.status).toBe(400)
  })

  it('rejects invalid customer id', async () => {
    const response = await POST(
      new Request('http://localhost/api/crm/registrations/not-a-uuid/cashback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount: 1000 }),
      }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) },
    )
    expect(response.status).toBe(400)
  })
})
