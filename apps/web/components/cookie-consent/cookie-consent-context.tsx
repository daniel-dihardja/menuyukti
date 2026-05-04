'use client'

import * as React from 'react'

import {
  type ConsentDecision,
  decisionFromStored,
  readConsent,
  writeConsent,
} from './cookie-consent-storage'

/**
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` is statically replaced at build time, so this
 * boolean is stable across server and client renders.
 */
const HAS_ANALYTICS_TOOLING = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)

type CookieConsentValue = {
  /** True only after we've read localStorage on the client. */
  hydrated: boolean
  /** Legacy: was true when optional analytics were accepted. Kept for API stability; shop GA is always on. */
  analyticsGranted: boolean
  /** Whether the bottom banner should be visible right now. */
  isBannerOpen: boolean
  /** Whether GA is configured at build time (gates banner + footer link visibility). */
  hasAnalyticsTooling: boolean
  decision: ConsentDecision
  /** Persists “seen” state and closes the informational cookie notice. */
  rejectAnalytics: () => void
  /** Reopens the cookie notice (e.g. from footer “Cookie settings”). */
  openPreferences: () => void
}

const Context = React.createContext<CookieConsentValue | null>(null)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [decision, setDecision] = React.useState<ConsentDecision>('unknown')
  const [hydrated, setHydrated] = React.useState(false)
  /** True when the user reopened the notice from the footer after already dismissing it. */
  const [forceBannerOpen, setForceBannerOpen] = React.useState(false)

  React.useEffect(() => {
    setDecision(decisionFromStored(readConsent()))
    setHydrated(true)
  }, [])

  const persist = React.useCallback((next: 'accepted' | 'rejected') => {
    writeConsent(next === 'accepted')
    setDecision(next)
  }, [])

  const rejectAnalytics = React.useCallback(() => {
    persist('rejected')
    setForceBannerOpen(false)
  }, [persist])

  const openPreferences = React.useCallback(() => {
    setForceBannerOpen(true)
  }, [])

  const isBannerOpen =
    HAS_ANALYTICS_TOOLING && hydrated && (decision === 'unknown' || forceBannerOpen)

  const value = React.useMemo<CookieConsentValue>(
    () => ({
      hydrated,
      analyticsGranted: decision === 'accepted',
      isBannerOpen,
      hasAnalyticsTooling: HAS_ANALYTICS_TOOLING,
      decision,
      rejectAnalytics,
      openPreferences,
    }),
    [decision, hydrated, isBannerOpen, openPreferences, rejectAnalytics],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useCookieConsent(): CookieConsentValue {
  const ctx = React.useContext(Context)
  if (!ctx) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider')
  }
  return ctx
}
