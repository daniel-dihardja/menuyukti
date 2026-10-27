import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { LOCALE_COOKIE_NAME } from './locale-cookie'
import { loadMessages, resolveAppLocale } from './load-messages'

export default getRequestConfig(async () => {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()])
  const locale = resolveAppLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: headerStore.get('accept-language'),
  })

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
