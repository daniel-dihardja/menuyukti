import { getRequestConfig } from 'next-intl/server'

import { DEFAULT_LOCALE, loadMessages } from './load-messages'

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
