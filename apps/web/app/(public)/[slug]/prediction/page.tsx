import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PublicPredictionsClient } from '@/app/(public)/[slug]/prediction/_components/public-predictions-client'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  PUBLIC_LOCATION_PREDICTIONS_QUERY,
  type PublicLocationPredictionsData,
} from '@/lib/graphql/queries/public-location'
import { isReservedPublicSlug } from '@/lib/public-location/reserved-slugs'
import { loadPublicLocation } from '@/lib/public-location/load-public-location'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.prediction')
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

export default async function PublicLocationPredictionPage({ params }: PageProps) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) notFound()

  const location = await loadPublicLocation(decoded)
  if (!location) notFound()

  const predictionService = location.services.find((s) => s.key === 'prediction')
  if (!predictionService?.available) notFound()

  const { userId } = await auth()
  const data = await graphqlQuery<PublicLocationPredictionsData>(
    PUBLIC_LOCATION_PREDICTIONS_QUERY,
    { slug: location.publicSlug },
    userId ?? undefined,
    'PublicLocationPredictions',
  )

  return (
    <PublicPredictionsClient
      slug={location.publicSlug}
      locationName={location.name}
      predictions={data.publicLocationPredictions}
    />
  )
}
