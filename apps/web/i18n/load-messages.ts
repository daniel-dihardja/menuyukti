import type { AbstractIntlMessages } from 'next-intl'

export const DEFAULT_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en', 'de', 'id'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'de' || value === 'id'
}

async function loadEnglishMessages(): Promise<AbstractIntlMessages> {
  const chunks = await Promise.all([
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
    import('../messages/en/explore.json'),
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

export function deepMergeMessages(
  base: AbstractIntlMessages,
  overlay: AbstractIntlMessages,
): AbstractIntlMessages {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMergeMessages(existing as AbstractIntlMessages, value as AbstractIntlMessages)
    } else {
      out[key] = value
    }
  }
  return out as AbstractIntlMessages
}

async function loadIndonesianOverlays(): Promise<AbstractIntlMessages[]> {
  const chunks = await Promise.all([
    import('../messages/id/accountMenu.json'),
    import('../messages/id/agentChat.json'),
    import('../messages/id/analytics.json'),
    import('../messages/id/appShell.json'),
    import('../messages/id/branches.json'),
    import('../messages/id/chat.json'),
    import('../messages/id/chatGatewayModels.json'),
    import('../messages/id/chatTools.json'),
    import('../messages/id/common.json'),
    import('../messages/id/cookieConsent.json'),
    import('../messages/id/docs.json'),
    import('../messages/id/errorBoundary.json'),
    import('../messages/id/igStudio.json'),
    import('../messages/id/landing.json'),
    import('../messages/id/legal.json'),
    import('../messages/id/login.json'),
    import('../messages/id/mainHeader.json'),
    import('../messages/id/media.json'),
    import('../messages/id/metadata.json'),
    import('../messages/id/notFound.json'),
    import('../messages/id/platform.json'),
    import('../messages/id/postCreator.json'),
    import('../messages/id/posts.json'),
    import('../messages/id/profile.json'),
    import('../messages/id/public.json'),
    import('../messages/id/pwaInstall.json'),
    import('../messages/id/services.json'),
    import('../messages/id/shop.json'),
    import('../messages/id/sidebar.json'),
    import('../messages/id/siteFooter.json'),
    import('../messages/id/staff.json'),
    import('../messages/id/upload.json'),
    import('../messages/id/usage.json'),
    import('../messages/id/wayfinding.json'),
  ])
  return chunks.map((m) => m.default as AbstractIntlMessages)
}

/**
 * Load next-intl message catalogs for a locale.
 * Catalogs live under `messages/<locale>/<namespace>.json` (one top-level key each).
 * For ``de`` / ``id``, English is the base; locale overlays deep-merge so partial
 * catalogs keep English keys.
 * Touch this module when message JSON changes fail to hot-reload under Turbopack.
 */
export async function loadMessages(locale: string): Promise<AbstractIntlMessages> {
  const base = await loadEnglishMessages()
  if (locale === 'de') {
    const [dePublic, deExplore] = await Promise.all([
      import('../messages/de/public.json'),
      import('../messages/de/explore.json'),
    ])
    return deepMergeMessages(deepMergeMessages(base, dePublic.default), deExplore.default)
  }
  if (locale === 'id') {
    const overlays = await loadIndonesianOverlays()
    return overlays.reduce((acc, overlay) => deepMergeMessages(acc, overlay), base)
  }
  return base
}

/** Pick a supported locale from an Accept-Language header value. */
export function resolveLocaleFromAcceptLanguage(header: string | null | undefined): AppLocale {
  if (!header?.trim()) return DEFAULT_LOCALE
  const parts = header.split(',')
  for (const part of parts) {
    const tag = part.trim().split(';')[0]?.trim().toLowerCase()
    if (!tag) continue
    if (tag === 'id' || tag.startsWith('id-')) return 'id'
    if (tag === 'de' || tag.startsWith('de-')) return 'de'
    if (tag === 'en' || tag.startsWith('en-')) return 'en'
  }
  return DEFAULT_LOCALE
}

/**
 * Prefer an explicit cookie locale when it is a supported AppLocale;
 * otherwise fall back to Accept-Language.
 */
export function resolveAppLocale(options: {
  cookieLocale?: string | null
  acceptLanguage?: string | null
}): AppLocale {
  const fromCookie = options.cookieLocale?.trim().toLowerCase()
  if (isAppLocale(fromCookie)) return fromCookie
  return resolveLocaleFromAcceptLanguage(options.acceptLanguage)
}
