'use client'

import { useTranslations } from 'next-intl'

import { useCookieConsent } from './cookie-consent-context'

const DEFAULT_LINK_CLASSNAME =
  'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * Footer trigger that reopens the cookie preferences sheet. Renders nothing when GA is not
 * configured for this build, so users only see it on environments where the choice matters.
 */
export function CookiePreferencesButton({ className }: { className?: string }) {
  const t = useTranslations('cookieConsent')
  const { hasAnalyticsTooling, openPreferences } = useCookieConsent()
  if (!hasAnalyticsTooling) return null
  return (
    <button type="button" className={className ?? DEFAULT_LINK_CLASSNAME} onClick={openPreferences}>
      {t('settingsLink')}
    </button>
  )
}
