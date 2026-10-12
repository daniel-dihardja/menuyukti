import { headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { loadMessages, resolveLocaleFromAcceptLanguage } from './load-messages'

export default getRequestConfig(async () => {
  const headerStore = await headers()
  const locale = resolveLocaleFromAcceptLanguage(headerStore.get('accept-language'))

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
