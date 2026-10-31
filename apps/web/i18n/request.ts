import { getRequestConfig } from 'next-intl/server'

import { DEFAULT_LOCALE, loadMessages } from './load-messages'

/**
 * Language selector is hidden for now — always serve English.
 * Cookie / Accept-Language resolution remains in load-messages for when the
 * account-menu locale switcher is re-enabled.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
