'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

/**
 * Permanent, non-dismissible beta notice (toast-style).
 * Shown on marketing / customer chrome — not on the operator shell.
 */
export function BetaStatusBanner() {
  const t = useTranslations('common')

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center',
        'px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2',
      )}
    >
      <p
        className={cn(
          'pointer-events-auto max-w-lg rounded-lg border border-border bg-card px-4 py-2.5',
          'text-center text-sm leading-snug text-card-foreground shadow-lg',
        )}
      >
        <span className="me-2 inline-flex items-center rounded-md bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground">
          {t('beta.badge')}
        </span>
        {t('beta.message')}
      </p>
    </div>
  )
}
