import countryConfig from './location-country-currency.json'

type CountryConfigEntry = {
  countryId: string
  country: string
  currency: string
  publicHolidayId: string
}

const countries = countryConfig.countries as readonly CountryConfigEntry[]

function toEnumTuple<const T extends string>(values: readonly T[]): [T, ...T[]] {
  if (values.length === 0) {
    throw new Error('Expected at least one value for enum tuple')
  }

  return [values[0], ...values.slice(1)] as [T, ...T[]]
}

export const COUNTRY_OPTIONS = countries
export const SUPPORTED_COUNTRY_IDS = COUNTRY_OPTIONS.map((entry) => entry.countryId)
export const SUPPORTED_COUNTRIES = COUNTRY_OPTIONS.map((entry) => entry.country)
export const SUPPORTED_CURRENCIES = [...new Set(COUNTRY_OPTIONS.map((entry) => entry.currency))]
export const SUPPORTED_PUBLIC_HOLIDAY_IDS = [
  ...new Set(COUNTRY_OPTIONS.map((entry) => entry.publicHolidayId)),
]

export const SUPPORTED_COUNTRY_ID_ENUM_VALUES = toEnumTuple(SUPPORTED_COUNTRY_IDS)
export const SUPPORTED_COUNTRY_ENUM_VALUES = toEnumTuple(SUPPORTED_COUNTRIES)
export const SUPPORTED_CURRENCY_ENUM_VALUES = toEnumTuple(SUPPORTED_CURRENCIES)
export const SUPPORTED_PUBLIC_HOLIDAY_ENUM_VALUES = toEnumTuple(SUPPORTED_PUBLIC_HOLIDAY_IDS)

export const countryIdToCountry = Object.fromEntries(
  COUNTRY_OPTIONS.map((entry) => [entry.countryId, entry.country]),
) as Record<string, string>

export const countryIdToCurrency = Object.fromEntries(
  COUNTRY_OPTIONS.map((entry) => [entry.countryId, entry.currency]),
) as Record<string, string>

export const countryIdToPublicHolidayId = Object.fromEntries(
  COUNTRY_OPTIONS.map((entry) => [entry.countryId, entry.publicHolidayId]),
) as Record<string, string>

export const countryNameToCountryId = Object.fromEntries(
  COUNTRY_OPTIONS.map((entry) => [entry.country.toLowerCase(), entry.countryId]),
) as Record<string, string>

export function normalizeCountryId(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return SUPPORTED_COUNTRY_IDS.includes(normalized) ? normalized : null
}

export function resolveCountryIdFromName(value: string | null | undefined): string | null {
  if (!value) return null
  return countryNameToCountryId[value.trim().toLowerCase()] ?? null
}

export function resolveCountrySelection(
  country: string | null | undefined,
  currency: string | null | undefined,
): {
  countryId: string
  country: string
  currency: string
} | null {
  const fromCountry = resolveCountryIdFromName(country)
  if (fromCountry) {
    return {
      countryId: fromCountry,
      country: countryIdToCountry[fromCountry] ?? '',
      currency: countryIdToCurrency[fromCountry] ?? '',
    }
  }

  if (!currency) return null
  const matched = COUNTRY_OPTIONS.find((entry) => entry.currency === currency.trim().toUpperCase())
  if (!matched) return null
  return {
    countryId: matched.countryId,
    country: matched.country,
    currency: matched.currency,
  }
}
