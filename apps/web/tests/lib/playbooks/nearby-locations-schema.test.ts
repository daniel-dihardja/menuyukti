import { describe, expect, it } from 'vitest'

import {
  nearbyScanBodySchema,
  nearbyScanResponseSchema,
} from '@/app/api/playbooks/nearby-locations/scan/schema'
import { formatLocationAddress, isNearbyFocusId } from '@/lib/playbooks/nearby-locations'

describe('nearbyScanBodySchema', () => {
  it('accepts a valid scan body', () => {
    const parsed = nearbyScanBodySchema.parse({
      locationId: 1,
      address: 'Jl. Example 1, Jakarta',
      instructions: 'Focus on lunch offices',
      focus: ['lunch_demand', 'competitors'],
    })
    expect(parsed.focus).toEqual(['lunch_demand', 'competitors'])
  })

  it('rejects empty focus', () => {
    expect(() =>
      nearbyScanBodySchema.parse({
        locationId: 1,
        address: 'Somewhere',
        focus: [],
      }),
    ).toThrow()
  })
})

describe('nearbyScanResponseSchema', () => {
  it('parses origin and nodes', () => {
    const parsed = nearbyScanResponseSchema.parse({
      origin: {
        id: 'o1',
        kind: 'origin',
        name: 'Cafe',
        placeId: 'abc',
        lat: -6.2,
        lng: 106.8,
        types: ['restaurant'],
        rating: 4.5,
        address: 'Jakarta',
        distanceMeters: 0,
        signals: [],
        marketingHook: null,
        sources: [],
      },
      nodes: [
        {
          id: 'n1',
          kind: 'demand',
          name: 'Office Tower',
          placeId: null,
          lat: -6.201,
          lng: 106.801,
          types: ['office'],
          rating: null,
          address: null,
          distanceMeters: 120,
          signals: ['Weekday lunch crowd'],
          marketingHook: 'Pitch weekday lunch delivery.',
          sources: ['https://example.com'],
        },
      ],
    })
    expect(parsed.nodes).toHaveLength(1)
    expect(parsed.nodes[0]?.kind).toBe('demand')
  })
})

describe('nearby helpers', () => {
  it('formats address parts', () => {
    expect(
      formatLocationAddress({
        street: 'Jl. Merdeka 1',
        city: 'Jakarta',
        country: 'Indonesia',
      }),
    ).toBe('Jl. Merdeka 1, Jakarta, Indonesia')
  })

  it('validates focus ids', () => {
    expect(isNearbyFocusId('schools')).toBe(true)
    expect(isNearbyFocusId('unknown')).toBe(false)
  })
})
