import { describe, expect, it } from 'vitest'

import { mapLocationToFormValues } from '@/lib/locations/map-location-to-form-values'

describe('mapLocationToFormValues', () => {
  it('maps opening hours and quick profile for LocationForm', () => {
    const mapped = mapLocationToFormValues({
      id: '10',
      name: 'Café',
      publicSlug: 'cafe',
      street: 'Main 1',
      city: 'Berlin',
      country: 'Germany',
      currency: 'EUR',
      openingHours: [
        { dayOfWeek: 'monday', openTime: '09:00', closeTime: '17:00' },
        { dayOfWeek: 'tuesday', openTime: '', closeTime: '' },
      ],
      manualBriefInput: {
        locationId: 10,
        quickProfile: { cuisine: 'Italian' },
      },
    })

    expect(mapped.initialValues.name).toBe('Café')
    expect(mapped.initialValues.openingHours.find((r) => r.dayOfWeek === 'monday')).toEqual({
      dayOfWeek: 'monday',
      closed: false,
      openTime: '09:00',
      closeTime: '17:00',
    })
    expect(mapped.initialValues.openingHours.find((r) => r.dayOfWeek === 'tuesday')?.closed).toBe(
      true,
    )
    expect(mapped.initialManualQuickProfile).toEqual({ cuisine: 'Italian' })
  })
})
