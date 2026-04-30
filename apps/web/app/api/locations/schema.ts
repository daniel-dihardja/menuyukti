import { z } from 'zod'
import {
  SUPPORTED_COUNTRY_ENUM_VALUES,
  SUPPORTED_COUNTRY_ID_ENUM_VALUES,
  SUPPORTED_CURRENCY_ENUM_VALUES,
  countryIdToCountry,
  countryIdToCurrency,
  normalizeCountryId,
  resolveCountrySelection,
} from '@/lib/locations/country-config'

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export const dayOfWeekSchema = z.enum(WEEKDAYS)

/** One row in the weekly schedule UI (always 7 rows, one per weekday). */
export const openingHourDaySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    /** When true, the location is closed that day; times are ignored. */
    closed: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.closed) {
      return
    }
    if (!data.openTime?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Open time is required for open days',
        path: ['openTime'],
      })
    }
    if (!data.closeTime?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Close time is required for open days',
        path: ['closeTime'],
      })
    }
    if (data.openTime?.trim() && data.closeTime?.trim() && data.openTime >= data.closeTime) {
      ctx.addIssue({
        code: 'custom',
        message: 'Close time must be after open time',
        path: ['closeTime'],
      })
    }
  })

export const openingHoursWeekSchema = z
  .array(openingHourDaySchema)
  .length(7)
  .superRefine((rows, ctx) => {
    const keys = rows.map((r) => r.dayOfWeek)
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each weekday must appear exactly once',
        path: [],
      })
    }
  })

export type OpeningHourDayInput = z.infer<typeof openingHourDaySchema>
export type OpeningHoursWeekInput = z.infer<typeof openingHoursWeekSchema>

/** Payload shape for `UPDATE_LOCATION_MUTATION` openingHours variable. */
export type OpeningHourMutationInput = {
  dayOfWeek: string
  openTime: string
  closeTime: string
}

export function openingHoursWeekToMutationInput(
  rows: OpeningHoursWeekInput,
): OpeningHourMutationInput[] {
  return rows
    .filter((entry) => !entry.closed && entry.openTime.trim() && entry.closeTime.trim())
    .map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      openTime: entry.openTime.trim(),
      closeTime: entry.closeTime.trim(),
    }))
}

const countryIdSchema = z.enum(SUPPORTED_COUNTRY_ID_ENUM_VALUES)
const countrySchema = z.enum(SUPPORTED_COUNTRY_ENUM_VALUES)
const currencySchema = z.enum(SUPPORTED_CURRENCY_ENUM_VALUES)
const optionalEmptyCountryIdSchema = z.union([z.literal(''), countryIdSchema]).default('')
const optionalEmptyCountrySchema = z.union([z.literal(''), countrySchema]).default('')
const optionalEmptyCurrencySchema = z.union([z.literal(''), currencySchema]).default('')

function trimString(value: string | undefined): string {
  return value?.trim() ?? ''
}

function normalizeLocationGeo(value: { countryId?: string; country?: string; currency?: string }): {
  countryId: string
  country: string
  currency: string
} {
  const countryId = normalizeCountryId(value.countryId)
  if (countryId) {
    const normalizedCurrency = value.currency?.trim().toUpperCase()
    return {
      countryId,
      country: countryIdToCountry[countryId] ?? '',
      currency: normalizedCurrency || countryIdToCurrency[countryId] || '',
    }
  }

  const resolved = resolveCountrySelection(value.country, value.currency)
  if (resolved) {
    return resolved
  }

  return {
    countryId: '',
    country: '',
    currency: '',
  }
}

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional().default(''),
  city: z.string().optional().default(''),
  countryId: optionalEmptyCountryIdSchema.optional().default(''),
  country: optionalEmptyCountrySchema.optional().default(''),
  currency: optionalEmptyCurrencySchema.optional().default(''),
  openingHours: openingHoursWeekSchema.optional(),
})
export const createLocationParsedSchema = createLocationSchema.transform((value) => {
  const normalized = normalizeLocationGeo(value)
  return {
    ...value,
    street: trimString(value.street),
    city: trimString(value.city),
    countryId: normalized.countryId,
    country: normalized.country,
    currency: normalized.currency,
  }
})

export type CreateLocationInput = z.infer<typeof createLocationParsedSchema>

export const updateLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional().default(''),
  city: z.string().optional().default(''),
  countryId: optionalEmptyCountryIdSchema.optional().default(''),
  country: optionalEmptyCountrySchema.optional().default(''),
  currency: optionalEmptyCurrencySchema.optional().default(''),
  openingHours: openingHoursWeekSchema,
  /** Owner brief hints; omit to leave unchanged, `{}` clears stored profile. */
  quickProfile: z.record(z.string(), z.unknown()).optional(),
})
export const updateLocationParsedSchema = updateLocationSchema.transform((value) => {
  const normalized = normalizeLocationGeo(value)
  return {
    ...value,
    street: trimString(value.street),
    city: trimString(value.city),
    countryId: normalized.countryId,
    country: normalized.country,
    currency: normalized.currency,
  }
})

export type UpdateLocationInput = z.infer<typeof updateLocationParsedSchema>
