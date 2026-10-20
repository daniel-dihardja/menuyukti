import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PublicGuestHeader, PublicGuestShell } from '@/app/(public)/_components/public-guest-shell'
import { PublicVenueHomeLink } from '@/app/(public)/_components/public-venue-home-link'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_PICKUP_OFFER_QUERY,
  type PublicLocationPickupOfferData,
} from '@/lib/graphql/queries/pickup-offers'
import { isReservedPublicSlug } from '@/lib/public-location/reserved-slugs'
import { loadPublicLocation } from '@/lib/public-location/load-public-location'

type PageProps = {
  params: Promise<{ slug: string }>
}

function formatWindow(fromIso: string, untilIso: string): string {
  const from = new Date(fromIso)
  const until = new Date(untilIso)
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return ''
  return `${from.toLocaleString()} – ${until.toLocaleString()}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.pickupOffer')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) {
    return { title: t('notFoundTitle') }
  }
  try {
    const location = await loadPublicLocation(decoded)
    if (!location) return { title: t('notFoundTitle') }
    const title = t('metaTitle', { name: location.name })
    const description = t('metaDescription', { name: location.name })
    return { title, description, openGraph: { title, description } }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

export default async function PublicLocationPickupOfferPage({ params }: PageProps) {
  const t = await getTranslations('public.pickupOffer')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) notFound()

  const location = await loadPublicLocation(decoded)
  if (!location) notFound()

  const pickupService = location.services.find((s) => s.key === 'pickup_offer')
  if (!pickupService?.available) notFound()

  const data = await graphqlQuery<PublicLocationPickupOfferData>(
    PUBLIC_LOCATION_PICKUP_OFFER_QUERY,
    { slug: location.publicSlug },
    undefined,
    'PublicLocationPickupOffer',
  )
  const offer = data.publicLocationPickupOffer
  const hasHeaderImage = Boolean(location.headerImageUrl)

  return (
    <PublicGuestShell>
      <PublicGuestHeader headerImageUrl={location.headerImageUrl}>
        <PublicVenueHomeLink
          slug={location.publicSlug}
          locationName={location.name}
          hasHeaderImage={hasHeaderImage}
          listingKind={location.listingKind}
        />
      </PublicGuestHeader>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 pb-16 sm:px-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-pretty text-sm text-muted-foreground">{t('lead')}</p>
        </header>

        {offer ? (
          <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-warm-sm)]">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {offer.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatWindow(offer.availableFrom, offer.availableUntil)}
              </p>
              {offer.price != null ? (
                <p className="text-sm font-medium text-foreground">
                  {t('price', { amount: offer.price })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('priceFree')}</p>
              )}
            </div>
            {offer.description ? (
              <p className="text-pretty text-base leading-relaxed text-foreground whitespace-pre-wrap">
                {offer.description}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">{t('pickupHint')}</p>
          </article>
        ) : (
          <p className="text-muted-foreground text-sm" role="status">
            {t('empty')}
          </p>
        )}
      </div>
    </PublicGuestShell>
  )
}
