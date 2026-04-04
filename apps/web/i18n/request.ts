import { headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

const supportedLocales = ['en', 'id'] as const
const defaultLocale = 'en'

function resolveLocale(acceptLanguage: string | null) {
  if (!acceptLanguage) return defaultLocale

  const preferredTags = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter((tag): tag is string => Boolean(tag))

  for (const tag of preferredTags) {
    const base = tag.split('-')[0] as (typeof supportedLocales)[number]
    if (supportedLocales.includes(base)) {
      return base
    }
  }

  return defaultLocale
}

export default getRequestConfig(async () => {
  const acceptLanguage = (await headers()).get('accept-language')
  const locale = resolveLocale(acceptLanguage)

  try {
    return {
      locale,
      messages: (await import(`../messages/${locale}.json`)).default,
    }
  } catch {
    // Fallback to default locale if message file doesn't exist yet.
    return {
      locale: defaultLocale,
      messages: (await import(`../messages/${defaultLocale}.json`)).default,
    }
  }
})
