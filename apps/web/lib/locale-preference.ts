import { LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME } from '@/i18n/locale-cookie'
import type { AppLocale } from '@/i18n/load-messages'

/** Locales offered in the account-menu language control. */
export const LANGUAGE_MENU_LOCALES = ['en', 'id'] as const
export type LanguageMenuLocale = (typeof LANGUAGE_MENU_LOCALES)[number]

export function isLanguageMenuLocale(value: string): value is LanguageMenuLocale {
  return value === 'en' || value === 'id'
}

/** Persist UI locale preference and reload so next-intl picks it up. */
export function setLocalePreferenceCookie(locale: AppLocale): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const parts = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    'path=/',
    `max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}`,
    'samesite=lax',
  ]
  if (secure) parts.push('secure')
  document.cookie = parts.join('; ')
}
