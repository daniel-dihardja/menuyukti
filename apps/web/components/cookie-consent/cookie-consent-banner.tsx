'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '@workspace/ui/components/button'
import { Collapsible, CollapsibleContent } from '@workspace/ui/components/collapsible'
import { Switch } from '@workspace/ui/components/switch'
import { cn } from '@workspace/ui/lib/utils'

import { routes } from '@/lib/routes'

import { useCookieConsent } from './cookie-consent-context'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const {
    isBannerOpen,
    isPreferencesOpen,
    analyticsGranted,
    acceptAnalytics,
    rejectAnalytics,
    openPreferences,
    closePreferences,
  } = useCookieConsent()

  const titleId = React.useId()
  const descId = React.useId()
  const preferencesHeadingId = React.useId()

  /** Mirrors the persisted decision while preferences are expanded so toggling is local until Save. */
  const [pendingAnalytics, setPendingAnalytics] = React.useState(analyticsGranted)
  React.useEffect(() => {
    if (isPreferencesOpen) setPendingAnalytics(analyticsGranted)
  }, [analyticsGranted, isPreferencesOpen])

  const onSavePreferences = React.useCallback(() => {
    if (pendingAnalytics) acceptAnalytics()
    else rejectAnalytics()
  }, [acceptAnalytics, pendingAnalytics, rejectAnalytics])

  const onPreferencesOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) openPreferences()
      else closePreferences()
    },
    [closePreferences, openPreferences],
  )

  return (
    <>
      {isBannerOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={cn(
            'fixed inset-x-0 bottom-0 z-[60] flex max-h-[calc(100dvh-env(safe-area-inset-top,0px)-0.75rem)] touch-manipulation flex-col overflow-hidden px-4 pt-4 sm:px-6',
            'pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
            'overscroll-behavior-contain',
          )}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg sm:p-5">
            <div className="shrink-0 flex min-w-0 flex-col gap-1.5">
              <h2 id={titleId} className="text-base font-semibold">
                {t('title')}
              </h2>
              <p
                id={descId}
                className="text-pretty text-sm leading-relaxed text-muted-foreground break-words"
              >
                {t('description')}{' '}
                <Link
                  href={routes.privacy}
                  className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t('privacyLink')}
                </Link>
                .
              </p>
            </div>

            <Collapsible
              open={isPreferencesOpen}
              onOpenChange={onPreferencesOpenChange}
              className="flex flex-col"
            >
              <CollapsibleContent
                className={cn(
                  'flex flex-col gap-3 overflow-hidden',
                  isPreferencesOpen &&
                    // Cap prefs block so title + actions stay on screen; scroll long copy inside the viewport.
                    'max-h-[min(58dvh,calc(100dvh-11.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] overflow-y-auto overscroll-y-contain',
                )}
              >
                <div className="flex flex-col gap-1 border-t border-border pt-3">
                  <h3 id={preferencesHeadingId} className="text-sm font-semibold text-foreground">
                    {t('preferences.title')}
                  </h3>
                  <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                    {t('preferences.description')}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">
                        {t('preferences.essentialTitle')}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t('preferences.essentialDescription')}
                      </p>
                    </div>
                    <Switch checked disabled aria-label={t('preferences.essentialAria')} />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">
                        {t('preferences.analyticsTitle')}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t('preferences.analyticsDescription')}
                      </p>
                    </div>
                    <Switch
                      checked={pendingAnalytics}
                      onCheckedChange={setPendingAnalytics}
                      aria-label={t('preferences.analyticsAria')}
                    />
                  </div>
                </div>
              </CollapsibleContent>

              {/*
                Mobile: full-width stacked actions (≥44px touch targets, `touch-manipulation` per Web Interface Guidelines).
                sm+: Customize on its own row; Reject | Accept in a two-column grid so both stay equally prominent.
                Expanded: Cancel | Save preferences in the same grid pattern.
              */}
              {!isPreferencesOpen ? (
                <div className="shrink-0 flex flex-col gap-2 sm:items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto sm:self-end"
                    onClick={openPreferences}
                  >
                    {t('customize')}
                  </Button>
                  <div className="grid w-full grid-cols-1 gap-2 sm:max-w-md sm:grid-cols-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full touch-manipulation sm:min-h-9"
                      onClick={rejectAnalytics}
                    >
                      {t('reject')}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 w-full touch-manipulation sm:min-h-9"
                      onClick={acceptAnalytics}
                    >
                      {t('accept')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="shrink-0 flex flex-col gap-2 border-t border-border pt-3 sm:items-end"
                  aria-labelledby={preferencesHeadingId}
                >
                  <div className="grid w-full grid-cols-1 gap-2 sm:max-w-md sm:grid-cols-2 sm:gap-3 sm:self-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full touch-manipulation sm:min-h-9"
                      onClick={closePreferences}
                    >
                      {t('preferences.cancel')}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 w-full touch-manipulation sm:min-h-9"
                      onClick={onSavePreferences}
                    >
                      {t('preferences.save')}
                    </Button>
                  </div>
                </div>
              )}
            </Collapsible>
          </div>
        </div>
      ) : null}
    </>
  )
}
