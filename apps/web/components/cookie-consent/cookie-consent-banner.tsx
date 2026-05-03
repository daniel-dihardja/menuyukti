'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
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

  /** Mirrors the persisted decision while the sheet is open so toggling is local until Save. */
  const [pendingAnalytics, setPendingAnalytics] = React.useState(analyticsGranted)
  React.useEffect(() => {
    if (isPreferencesOpen) setPendingAnalytics(analyticsGranted)
  }, [analyticsGranted, isPreferencesOpen])

  const onSavePreferences = React.useCallback(() => {
    if (pendingAnalytics) acceptAnalytics()
    else rejectAnalytics()
  }, [acceptAnalytics, pendingAnalytics, rejectAnalytics])

  return (
    <>
      {isBannerOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 px-4 pt-4 sm:px-6',
            'pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
          )}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg sm:p-5">
            <div className="flex flex-col gap-1.5">
              <h2 id={titleId} className="text-base font-semibold">
                {t('title')}
              </h2>
              <p id={descId} className="text-sm leading-relaxed text-muted-foreground">
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={openPreferences}>
                {t('customize')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={rejectAnalytics}>
                {t('reject')}
              </Button>
              <Button type="button" size="sm" onClick={acceptAnalytics}>
                {t('accept')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Sheet
        open={isPreferencesOpen}
        onOpenChange={(open) => {
          if (!open) closePreferences()
        }}
      >
        <SheetContent side="right" className="flex flex-col gap-0">
          <SheetHeader>
            <SheetTitle>{t('preferences.title')}</SheetTitle>
            <SheetDescription>{t('preferences.description')}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
            <div className="rounded-lg border border-border bg-card p-4">
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
            <div className="rounded-lg border border-border bg-card p-4">
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
          </div>
          <SheetFooter className="flex-row justify-end">
            <Button type="button" variant="ghost" onClick={closePreferences}>
              {t('preferences.cancel')}
            </Button>
            <Button type="button" onClick={onSavePreferences}>
              {t('preferences.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
