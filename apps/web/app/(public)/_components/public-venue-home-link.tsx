'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

type PublicVenueHomeLinkProps = {
  slug: string
  locationName: string
  /** When true, use light text suitable for cover-image headers. */
  hasHeaderImage?: boolean
  /** Guest-facing listing kind; shows a Community badge when `community`. */
  listingKind?: 'commercial' | 'community' | null
  className?: string
  titleClassName?: string
}

/**
 * Venue name as the home control for guest service pages (menu, Pick & Win).
 * Quiet “Home” cue underneath so the affordance is obvious.
 */
export function PublicVenueHomeLink({
  slug,
  locationName,
  hasHeaderImage = false,
  listingKind = null,
  className,
  titleClassName,
}: PublicVenueHomeLinkProps) {
  const t = useTranslations('public.guest')
  const tHome = useTranslations('public.locationHome')

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className={cn(
            'font-heading text-4xl leading-tight tracking-tight text-pretty sm:text-5xl',
            hasHeaderImage ? 'text-white' : 'text-foreground',
            titleClassName,
          )}
        >
          <Link
            href={routes.public.locationHome(slug)}
            aria-label={t('homeLinkAria', { name: locationName })}
            className="underline-offset-4 transition-opacity hover:opacity-90 hover:underline"
          >
            {locationName}
          </Link>
        </h1>
        {listingKind === 'community' ? (
          <span
            className={cn(
              'rounded-md border px-2 py-1 text-xs font-medium tracking-wide uppercase',
              hasHeaderImage
                ? 'border-white/40 bg-black/35 text-white'
                : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {tHome('communityBadge')}
          </span>
        ) : null}
      </div>
      <p className={cn('text-sm', hasHeaderImage ? 'text-white/75' : 'text-muted-foreground')}>
        {t('homeCue')}
      </p>
    </div>
  )
}
