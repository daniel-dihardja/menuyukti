import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'

import { ExploreFilters } from '@/app/explore/_components/explore-filters'
import { ExploreVenueGrid } from '@/app/explore/_components/explore-venue-grid'
import { SiteFooter } from '@/components/site-footer'
import { loadPublicLocations } from '@/lib/public-location/load-public-locations'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

type PageProps = {
  searchParams: Promise<{
    city?: string | string[]
    q?: string | string[]
    pickup?: string | string[]
  }>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    const trimmed = value[0].trim()
    return trimmed || null
  }
  return null
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('explore')
  const title = t('metaTitle')
  const description = t('metaDescription')
  return {
    title,
    description,
    alternates: {
      canonical: routes.explore,
    },
    openGraph: {
      title,
      description,
      url: routes.explore,
      siteName: 'Menuyukti',
      type: 'website',
    },
    robots: { index: false, follow: false },
  }
}

export default async function ExplorePage({ searchParams }: PageProps) {
  // SiteFooter → Clerk auth() reads Date.now(); without this, Cache Components
  // treats that as an unstable value during prerender of this page segment.
  await connection()
  const t = await getTranslations('explore')
  const params = await searchParams
  const city = firstParam(params.city)
  const query = firstParam(params.q)
  const pickupRaw = firstParam(params.pickup)
  const pickup = pickupRaw === '1' || pickupRaw === 'true'
  const directory = await loadPublicLocations({
    city,
    query,
    hasPickupOffer: pickup ? true : null,
  })
  const hasActiveFilters = Boolean(city || query || pickup)

  const horizontalPadding =
    'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]'

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] min-w-0 flex-col bg-background text-foreground">
      <a
        href="#explore-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main
        id="explore-main"
        className="relative flex min-w-0 w-full flex-1 flex-col"
        tabIndex={-1}
      >
        <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
        <div className="pointer-events-none absolute inset-0 landing-atmosphere" aria-hidden />

        <div
          className={cn(
            'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 py-10 md:gap-10 md:py-14',
            horizontalPadding,
          )}
        >
          <header className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {t('title')}
            </h1>
            <p className="text-pretty text-base text-muted-foreground md:text-lg">
              {t('subtitle')}
            </p>
          </header>

          <ExploreFilters cities={directory.cities} city={city} query={query} pickup={pickup} />

          <ExploreVenueGrid locations={directory.locations} hasActiveFilters={hasActiveFilters} />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
