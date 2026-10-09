import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PublicLocationHub } from '@/app/(public)/[slug]/_components/public-location-hub'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_POINT_BALANCES_QUERY,
  type MyPointBalancesData,
} from '@/lib/graphql/queries/point-ledger'
import {
  PUBLIC_LOCATION_PREDICTIONS_QUERY,
  PUBLIC_LOCATION_VOTINGS_QUERY,
  type PublicLocationPredictionsData,
  type PublicLocationVotingsData,
} from '@/lib/graphql/queries/public-location'
import { isReservedPublicSlug } from '@/lib/public-location/reserved-slugs'
import { loadPublicLocation } from '@/lib/public-location/load-public-location'

type PageProps = {
  params: Promise<{ slug: string }>
}

function greetingLead(
  t: Awaited<ReturnType<typeof getTranslations<'public.locationHome'>>>,
  hour: number,
): string {
  if (hour < 12) return t('greetingMorning')
  if (hour < 17) return t('greetingAfternoon')
  return t('greetingEvening')
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

  const { userId } = await auth()
  const predictionAvailable = Boolean(
    location.services.find((s) => s.key === 'pick_and_win')?.available,
  )
  const votingAvailable = Boolean(location.services.find((s) => s.key === 'voting')?.available)
  const pointSystemAvailable = Boolean(
    location.services.find((s) => s.key === 'point_system')?.available,
  )

  const [predictionsResult, votingsResult, balancesResult] = await Promise.all([
    predictionAvailable
      ? graphqlQuery<PublicLocationPredictionsData>(
          PUBLIC_LOCATION_PREDICTIONS_QUERY,
          { slug: location.publicSlug },
          userId ?? undefined,
          'PublicLocationPredictions',
        )
      : Promise.resolve(null),
    votingAvailable
      ? graphqlQuery<PublicLocationVotingsData>(
          PUBLIC_LOCATION_VOTINGS_QUERY,
          { slug: location.publicSlug },
          userId ?? undefined,
          'PublicLocationVotings',
        )
      : Promise.resolve(null),
    userId && pointSystemAvailable
      ? graphqlQuery<MyPointBalancesData>(MY_POINT_BALANCES_QUERY, {}, userId, 'MyPointBalances')
      : Promise.resolve(null),
  ])

  let pointBalance: number | null = null
  if (userId && pointSystemAvailable) {
    const row = balancesResult?.myPointBalances.find((b) => b.locationId === location.id)
    pointBalance = row?.balance ?? 0
  }

  return (
    <PublicLocationHub
      location={location}
      pointBalance={pointBalance}
      isSignedIn={Boolean(userId)}
      predictions={predictionsResult?.publicLocationPredictions ?? []}
      votings={votingsResult?.publicLocationVotings ?? []}
      copy={{
        lead: greetingLead(t, new Date().getHours()),
        emptyLead: t('greetingEmpty'),
        menuTitle: t('menuTitle'),
        menuDishCount: (count) => t('menuDishCount', { count }),
        menuEarnPoints: t('menuEarnPoints'),
        menuCtaAria: t('menuCtaAria'),
        rewardingTitle: t('rewardingTitle'),
        predictionTitle: t('predictionTitle'),
        predictionDescription: t('predictionDescription'),
        predictionOpenCount: (count) => t('predictionOpenCount', { count }),
        predictionPoints: (points) => t('predictionPoints', { points }),
        predictionPointsWithCorrect: (vote, correct) =>
          t('predictionPointsWithCorrect', { vote, correct }),
        predictionRewardInvite: t('predictionRewardInvite'),
        predictionCta: t('predictionCta'),
        predictionCtaDone: t('predictionCtaDone'),
        votingPoints: (points) => t('votingPoints', { points }),
        votingRewardInvite: t('votingRewardInvite'),
        votingCta: t('votingCta'),
        votingCtaDone: t('votingCtaDone'),
        votingSeeAll: t('votingSeeAll'),
        rewardsTitle: t('rewardsTitle'),
        rewardsLead: t('rewardsLead'),
        rewardsCta: t('rewardsCta'),
        rewardsCtaSignIn: t('rewardsCtaSignIn'),
      }}
    />
  )
}
