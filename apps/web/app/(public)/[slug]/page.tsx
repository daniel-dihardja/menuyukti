import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PublicLocationHub } from '@/app/(public)/[slug]/_components/public-location-hub'
import { isReservedPublicSlug } from '@/lib/public-location/reserved-slugs'
import { loadPublicLocation } from '@/lib/public-location/load-public-location'

type PageProps = {
  params: Promise<{ slug: string }>
}

function greetingLead(
  t: Awaited<ReturnType<typeof getTranslations<'public.locationHome'>>>,
  name: string,
  hour: number,
): string {
  if (hour < 12) return t('greetingMorning', { name })
  if (hour < 17) return t('greetingAfternoon', { name })
  return t('greetingEvening', { name })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.locationHome')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) {
    return { title: t('notFoundTitle') }
  }
  try {
    const location = await loadPublicLocation(decoded)
    if (!location) return { title: t('notFoundTitle') }
    const title = location.name
    const description = t('metaDescription', { name: location.name })
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(location.headerImageUrl ? { images: [{ url: location.headerImageUrl }] } : {}),
      },
    }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

export default async function PublicLocationHomePage({ params }: PageProps) {
  const t = await getTranslations('public.locationHome')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) notFound()

  const location = await loadPublicLocation(decoded)
  if (!location) notFound()

  return (
    <PublicLocationHub
      location={location}
      copy={{
        lead: greetingLead(t, location.name, new Date().getHours()),
        emptyLead: t('greetingEmpty'),
        menuTitle: t('menuTitle'),
        menuDishCount: (count) => t('menuDishCount', { count }),
        predictionTitle: t('predictionTitle'),
        predictionOpenCount: (count) => t('predictionOpenCount', { count }),
        votingTitle: t('votingTitle'),
        votingOpenCount: (count) => t('votingOpenCount', { count }),
      }}
    />
  )
}
