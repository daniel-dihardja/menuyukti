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
  className,
  titleClassName,
}: PublicVenueHomeLinkProps) {
  const t = useTranslations('public.guest')

  return (
    <div className={cn('space-y-1', className)}>
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
      <p className={cn('text-sm', hasHeaderImage ? 'text-white/75' : 'text-muted-foreground')}>
        {t('homeCue')}
      </p>
    </div>
  )
}
