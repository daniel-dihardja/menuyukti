import { getRequestConfig } from 'next-intl/server'

const defaultLocale = 'en'

export default getRequestConfig(async () => {
  const locale = defaultLocale

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
