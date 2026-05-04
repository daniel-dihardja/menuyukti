'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '@workspace/ui/components/button'
import { Switch } from '@workspace/ui/components/switch'
import { cn } from '@workspace/ui/lib/utils'

import { routes } from '@/lib/routes'

import { useCookieConsent } from './cookie-consent-context'

export function CookieConsentBanner() {
  const t = useTranslations('cookieConsent')
  const { isBannerOpen, rejectAnalytics } = useCookieConsent()

  const titleId = React.useId()
  const descId = React.useId()

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

            {/*
              Mobile: full-width button (≥44px touch target, `touch-manipulation` per Web Interface Guidelines).
              sm+: align end to match prior banner actions.
            */}
            <div className="shrink-0 flex flex-col gap-2 sm:items-end">
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:max-w-md sm:self-end"
                onClick={rejectAnalytics}
              >
                {t('dismiss')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
