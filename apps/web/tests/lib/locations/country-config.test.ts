import { describe, expect, it } from 'vitest'

import { createLocationParsedSchema, updateLocationParsedSchema } from '@/app/api/locations/schema'
import {
  countryIdToPublicHolidayId,
  resolveCountryIdFromName,
  resolveCountrySelection,
} from '@/lib/locations/country-config'

describe('country-config mapping', () => {
  it('maps Germany countryId to public holiday source id', () => {
    expect(countryIdToPublicHolidayId.de).toBe('de')
  })

  it('resolves country id from persisted location country name', () => {
    expect(resolveCountryIdFromName('Germany')).toBe('de')
    expect(resolveCountryIdFromName('Indonesia')).toBe('id')
  })

  it('resolves a normalized selection from country + currency strings', () => {
    const resolved = resolveCountrySelection('Germany', 'EUR')
    expect(resolved).toEqual({
      countryId: 'de',
      country: 'Germany',
      currency: 'EUR',
    })
  })
})

describe('location schema geo parsing', () => {
  it('derives country and currency from countryId in create payload', () => {
    const parsed = createLocationParsedSchema.parse({
      name: 'Berlin Mitte',
      countryId: 'de',
      country: '',
      currency: '',
    })

    expect(parsed.country).toBe('Germany')
    expect(parsed.currency).toBe('EUR')
  })

  it('rejects unsupported currency for updates', () => {
    const parsed = updateLocationParsedSchema.safeParse({
      name: 'Jakarta Pusat',
      countryId: '',
      country: 'Indonesia',
      currency: 'EURO',
      openingHours: [
        { dayOfWeek: 'monday', closed: true, openTime: '', closeTime: '' },
        { dayOfWeek: 'tuesday', closed: true, openTime: '', closeTime: '' },
        { dayOfWeek: 'wednesday', closed: true, openTime: '', closeTime: '' },
        { dayOfWeek: 'thursday', closed: true, openTime: '', closeTime: '' },
        { dayOfWeek: 'friday', closed: true, openTime: '', closeTime: '' },
        { dayOfWeek: 'saturday', closed: true, openTime: '', closeTime: '' },
        { dayOfWeek: 'sunday', closed: true, openTime: '', closeTime: '' },
      ],
    })

    expect(parsed.success).toBe(false)
  })
})
