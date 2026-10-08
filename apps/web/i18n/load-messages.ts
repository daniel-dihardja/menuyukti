import type { AbstractIntlMessages } from 'next-intl'

export const DEFAULT_LOCALE = 'en'

async function loadEnglishMessages(): Promise<AbstractIntlMessages> {
  const chunks = await Promise.all([
    import('../messages/en/about.json'),
    import('../messages/en/accountMenu.json'),
    import('../messages/en/agentChat.json'),
    import('../messages/en/agents.json'),
    import('../messages/en/analytics.json'),
    import('../messages/en/appShell.json'),
    import('../messages/en/branches.json'),
    import('../messages/en/chat.json'),
    import('../messages/en/chatGatewayModels.json'),
    import('../messages/en/chatTools.json'),
    import('../messages/en/common.json'),
    import('../messages/en/cookieConsent.json'),
    import('../messages/en/docs.json'),
    import('../messages/en/errorBoundary.json'),
    import('../messages/en/guestHome.json'),
    import('../messages/en/igStudio.json'),
    import('../messages/en/igstories.json'),
    import('../messages/en/inventar.json'),
    import('../messages/en/landing.json'),
    import('../messages/en/legal.json'),
    import('../messages/en/login.json'),
    import('../messages/en/mainHeader.json'),
    import('../messages/en/media.json'),
    import('../messages/en/metadata.json'),
    import('../messages/en/news.json'),
    import('../messages/en/notFound.json'),
    import('../messages/en/platform.json'),
    import('../messages/en/playbooks.json'),
    import('../messages/en/pos.json'),
    import('../messages/en/postCreator.json'),
    import('../messages/en/posts.json'),
    import('../messages/en/profile.json'),
    import('../messages/en/public.json'),
    import('../messages/en/pwaInstall.json'),
    import('../messages/en/reels.json'),
    import('../messages/en/services.json'),
    import('../messages/en/shop.json'),
    import('../messages/en/sidebar.json'),
    import('../messages/en/siteFooter.json'),
    import('../messages/en/staff.json'),
    import('../messages/en/upload.json'),
    import('../messages/en/usage.json'),
    import('../messages/en/wayfinding.json'),
    import('../messages/en/workspaceTeam.json'),
  ])
  return Object.assign({}, ...chunks.map((m) => m.default)) as AbstractIntlMessages
}

/**
 * Load next-intl message catalogs for a locale.
 * Catalogs live under `messages/<locale>/<namespace>.json` (one top-level key each).
 * Falls back to English when the locale is missing (only `en` is shipped today).
 */
export async function loadMessages(locale: string): Promise<AbstractIntlMessages> {
  // Future locales: branch on locale and load messages/<locale>/*.json.
  if (locale !== DEFAULT_LOCALE) {
    return loadEnglishMessages()
  }
  return loadEnglishMessages()
}
