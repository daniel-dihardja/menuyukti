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
  /** True when the user has explicitly accepted analytics. SSR snapshot is `false`. */
  analyticsGranted: boolean
  /** Whether the bottom banner should be visible right now. */
  isBannerOpen: boolean
  /** Whether the customize sheet is open. */
  isPreferencesOpen: boolean
  /** Whether GA is configured at build time (gates banner + footer link visibility). */
  hasAnalyticsTooling: boolean
  decision: ConsentDecision
  acceptAnalytics: () => void
  rejectAnalytics: () => void
  openPreferences: () => void
  closePreferences: () => void
}

const Context = React.createContext<CookieConsentValue | null>(null)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [decision, setDecision] = React.useState<ConsentDecision>('unknown')
  const [hydrated, setHydrated] = React.useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = React.useState(false)
  /** True when the user reopened settings from the footer after already deciding. */
  const [forceBannerOpen, setForceBannerOpen] = React.useState(false)

  React.useEffect(() => {
    setDecision(decisionFromStored(readConsent()))
    setHydrated(true)
  }, [])

  const persist = React.useCallback((next: 'accepted' | 'rejected') => {
    writeConsent(next === 'accepted')
    setDecision(next)
  }, [])

  const acceptAnalytics = React.useCallback(() => {
    persist('accepted')
    setIsPreferencesOpen(false)
    setForceBannerOpen(false)
  }, [persist])

  const rejectAnalytics = React.useCallback(() => {
    persist('rejected')
    setIsPreferencesOpen(false)
    setForceBannerOpen(false)
  }, [persist])

  const openPreferences = React.useCallback(() => {
    setIsPreferencesOpen(true)
    setForceBannerOpen(true)
  }, [])

  const closePreferences = React.useCallback(() => {
    setIsPreferencesOpen(false)
  }, [])

  const isBannerOpen =
    HAS_ANALYTICS_TOOLING && hydrated && (decision === 'unknown' || forceBannerOpen)

  const value = React.useMemo<CookieConsentValue>(
    () => ({
      hydrated,
      analyticsGranted: decision === 'accepted',
      isBannerOpen,
      isPreferencesOpen,
      hasAnalyticsTooling: HAS_ANALYTICS_TOOLING,
      decision,
      acceptAnalytics,
      rejectAnalytics,
      openPreferences,
      closePreferences,
    }),
    [
      acceptAnalytics,
      closePreferences,
      decision,
      hydrated,
      isBannerOpen,
      isPreferencesOpen,
      openPreferences,
      rejectAnalytics,
    ],
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
