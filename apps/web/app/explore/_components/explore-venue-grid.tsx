import { UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import type { PublicLocationDirectoryItemView } from '@/lib/public-location/load-public-locations'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

type ExploreVenueGridProps = {
  locations: PublicLocationDirectoryItemView[]
  hasActiveFilters: boolean
}

export async function ExploreVenueGrid({ locations, hasActiveFilters }: ExploreVenueGridProps) {
  const t = await getTranslations('explore')

  if (locations.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center"
        role="status"
      >
        <p className="text-base font-medium text-foreground">
          {hasActiveFilters ? t('emptyFiltersTitle') : t('emptyCatalogTitle')}
        </p>
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">
          {hasActiveFilters ? t('emptyFiltersBody') : t('emptyCatalogBody')}
        </p>
        {hasActiveFilters ? (
          <Link
            href={routes.explore}
            className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('clearFilters')}
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((location) => (
        <li key={location.id}>
          <Link
            href={routes.public.locationHome(location.publicSlug)}
            aria-label={t('cardAria', { name: location.name })}
            className={cn(
              'group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card',
              'shadow-[var(--shadow-warm-sm)] transition-colors hover:border-border-strong',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
              {location.headerImageUrl ? (
                // Presigned / short-lived URLs — skip next/image optimizer
                // eslint-disable-next-line @next/next/no-img-element -- public media presign
                <img
                  src={location.headerImageUrl}
                  alt={t('imageAlt', { name: location.name })}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <UtensilsCrossed className="size-8 opacity-50" aria-hidden />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 px-4 py-3">
              <p className="text-base font-semibold tracking-tight text-foreground">
                {location.name}
              </p>
              {location.city ? (
                <p className="text-sm text-muted-foreground">{location.city}</p>
              ) : null}
              <p className="mt-auto pt-2 text-xs text-muted-foreground">
                {t('dishCount', { count: location.menuDishCount })}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
