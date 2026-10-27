import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { isFeatureEnabled } from '@/lib/feature-flags'
import { routes } from '@/lib/routes'

const COPYRIGHT_YEAR = 2026

const linkClassName =
  'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export async function SiteFooter() {
  const t = await getTranslations('siteFooter')
  const { isAuthenticated } = await auth()
  /** Explore is Clerk-protected and feature-flagged — only show when enabled. */
  const showExplore = isAuthenticated && isFeatureEnabled('explore')

  return (
    <footer className="mt-auto bg-surface text-foreground">
      <div className="h-px w-full bg-border-strong" aria-hidden />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-5">
        {/* Explore lives in the header from md up — keep footer link for mobile only. */}
        {showExplore ? (
          <nav
            aria-label={t('navAria')}
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm md:hidden"
          >
            <Link href={routes.explore} className={linkClassName}>
              {t('explore')}
            </Link>
          </nav>
        ) : null}
        <p className="text-center text-sm tracking-wide text-muted-foreground">
          {t('copyright', { year: COPYRIGHT_YEAR })}
        </p>
      </div>
    </footer>
  )
}
