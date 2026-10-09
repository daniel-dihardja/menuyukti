import { ArrowUpRight, Gift, Sparkles, Trophy, Vote } from 'lucide-react'
import Link from 'next/link'

import { PublicHubServiceCard } from '@/app/(public)/[slug]/_components/public-hub-service-card'
import { PublicGuestHeader, PublicGuestShell } from '@/app/(public)/_components/public-guest-shell'
import { PublicGuestPointsSync } from '@/components/public-guest-points-context'
import { buildLoginUrl } from '@/lib/auth-return-path'
import type { Prediction } from '@/lib/graphql/queries/predictions'
import type { Voting } from '@/lib/graphql/queries/votings'
import type { PublicLocationView } from '@/lib/public-location/load-public-location'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

type HubCopy = {
  lead: string
  emptyLead: string
  menuTitle: string
  menuDishCount: (count: number) => string
  menuEarnPoints: string
  menuCtaAria: string
  rewardingTitle: string
  predictionTitle: string
  predictionDescription: string
  predictionOpenCount: (count: number) => string
  predictionPoints: (points: number) => string
  predictionCta: string
  predictionCtaDone: string
  votingTitle: string
  votingDescription: string
  votingOpenCount: (count: number) => string
  votingPoints: (points: number) => string
  votingCta: string
  votingCtaDone: string
  rewardsTitle: string
  rewardsLead: string
  rewardsCta: string
  rewardsCtaSignIn: string
}

type PublicLocationHubProps = {
  location: PublicLocationView
  copy: HubCopy
  /** Venue balance when Point System is on and guest is signed in; otherwise null. */
  pointBalance: number | null
  isSignedIn: boolean
  predictions: Prediction[]
  votings: Voting[]
}

function truncateTeaser(text: string, max = 88): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

function serviceAvailable(location: PublicLocationView, key: string): boolean {
  return Boolean(location.services.find((s) => s.key === key)?.available)
}

export function PublicLocationHub({
  location,
  copy,
  pointBalance,
  isSignedIn,
  predictions,
  votings,
}: PublicLocationHubProps) {
  const menuAvailable = serviceAvailable(location, 'digital_menu')
  const predictionAvailable = serviceAvailable(location, 'pick_and_win')
  const votingAvailable = serviceAvailable(location, 'voting')
  const pointSystemAvailable = serviceAvailable(location, 'point_system')
  const hasServices = menuAvailable || predictionAvailable || votingAvailable
  const hasInteractive = predictionAvailable || votingAvailable
  const hasHeaderImage = Boolean(location.headerImageUrl)

  const menuHref = routes.public.locationMenu(location.publicSlug)
  const predictionHref = routes.public.locationPickAndWin(location.publicSlug)
  const votingHref = routes.public.locationVoting(location.publicSlug)
  const rewardsHref = isSignedIn
    ? routes.home
    : buildLoginUrl(routes.public.locationHome(location.publicSlug))

  const menuSubtitle =
    menuAvailable && location.menuDishCount != null && location.menuDishCount > 0
      ? copy.menuDishCount(location.menuDishCount)
      : null

  const openPredictions = predictions.filter((p) => p.status === 'open')
  const primaryPrediction = openPredictions[0] ?? predictions[0] ?? null
  const predictionCompleted = Boolean(primaryPrediction?.myVote)
  let predictionDescription: string | null = null
  if (predictionAvailable && location.predictionTeaser) {
    const teaser = location.predictionTeaser
    predictionDescription =
      teaser.openCount > 1
        ? copy.predictionOpenCount(teaser.openCount)
        : truncateTeaser(teaser.question) || copy.predictionDescription
  } else if (predictionAvailable) {
    predictionDescription = copy.predictionDescription
  }
  const predictionPoints =
    location.predictionTeaser?.rewardMode === 'points' &&
    location.predictionTeaser.pointsForVote > 0
      ? copy.predictionPoints(location.predictionTeaser.pointsForVote)
      : primaryPrediction?.rewardMode === 'points' && primaryPrediction.pointsForVote > 0
        ? copy.predictionPoints(primaryPrediction.pointsForVote)
        : null

  const openVotings = votings.filter((v) => v.status === 'open')
  const primaryVoting = openVotings[0] ?? votings[0] ?? null
  const votingCompleted = Boolean(primaryVoting?.myVote)
  let votingDescription: string | null = null
  if (votingAvailable && location.votingTeaser) {
    const teaser = location.votingTeaser
    votingDescription =
      teaser.openCount > 1
        ? copy.votingOpenCount(teaser.openCount)
        : truncateTeaser(teaser.question) || copy.votingDescription
  } else if (votingAvailable) {
    votingDescription = copy.votingDescription
  }
  const votingPoints =
    location.votingTeaser?.rewardMode === 'points' && location.votingTeaser.pointsForVote > 0
      ? copy.votingPoints(location.votingTeaser.pointsForVote)
      : primaryVoting?.rewardMode === 'points' && primaryVoting.pointsForVote > 0
        ? copy.votingPoints(primaryVoting.pointsForVote)
        : null

  return (
    <PublicGuestShell>
      <PublicGuestPointsSync balance={pointBalance} />

      <PublicGuestHeader headerImageUrl={location.headerImageUrl}>
        <h1
          className={cn(
            'public-hub-enter-title font-heading text-4xl leading-tight tracking-tight text-pretty sm:text-5xl',
            hasHeaderImage ? 'text-white' : 'text-foreground',
          )}
        >
          {location.name}
        </h1>
        <p
          className={cn(
            'public-hub-enter-lead mt-3 max-w-md text-pretty text-base leading-relaxed sm:text-lg',
            hasHeaderImage ? 'text-white/85' : 'text-muted-foreground',
          )}
        >
          {hasServices ? copy.lead : copy.emptyLead}
        </p>
      </PublicGuestHeader>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 pb-16 sm:px-10">
        {menuAvailable ? (
          <Link
            href={menuHref}
            aria-label={copy.menuCtaAria}
            className={cn(
              'public-hub-enter-cta group relative flex w-full flex-col gap-2 overflow-hidden rounded-xl bg-primary px-5 py-5 text-primary-foreground shadow-[var(--shadow-warm-sm)] transition-[transform,box-shadow] duration-200',
              'hover:shadow-[var(--shadow-warm-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <ArrowUpRight
              className="absolute end-4 top-4 size-5 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
            <span className="pe-8 text-xl font-semibold tracking-tight sm:text-2xl">
              {copy.menuTitle}
            </span>
            {menuSubtitle ? (
              <span className="text-sm font-normal opacity-90">{menuSubtitle}</span>
            ) : null}
            {location.menuOpenPoints != null && location.menuOpenPoints > 0 ? (
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium opacity-90">
                <Sparkles className="size-3.5 shrink-0" aria-hidden />
                {copy.menuEarnPoints}
              </span>
            ) : null}
          </Link>
        ) : null}

        {hasInteractive ? (
          <section aria-labelledby="public-hub-rewarding-heading" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="public-hub-rewarding-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {copy.rewardingTitle}
              </h2>
              <Gift className="size-5 shrink-0 text-warning" aria-hidden />
            </div>

            <div className="flex flex-col gap-3">
              {predictionAvailable ? (
                <PublicHubServiceCard
                  href={predictionHref}
                  title={copy.predictionTitle}
                  description={predictionDescription}
                  pointsLabel={predictionPoints}
                  ctaLabel={predictionCompleted ? copy.predictionCtaDone : copy.predictionCta}
                  completed={predictionCompleted}
                  icon={Trophy}
                  iconWrapClassName="tone-creative text-foreground"
                  primaryCta
                />
              ) : null}

              {votingAvailable ? (
                <PublicHubServiceCard
                  href={votingHref}
                  title={copy.votingTitle}
                  description={votingDescription}
                  pointsLabel={votingPoints}
                  ctaLabel={votingCompleted ? copy.votingCtaDone : copy.votingCta}
                  completed={votingCompleted}
                  icon={Vote}
                  iconWrapClassName="tone-analytics text-foreground"
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {pointSystemAvailable ? (
          <section
            aria-labelledby="public-hub-rewards-heading"
            className="public-hub-enter-cta-secondary rounded-xl border border-border bg-muted/50 px-5 py-5"
          >
            <div className="flex items-start gap-3">
              <Gift className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2
                  id="public-hub-rewards-heading"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  {copy.rewardsTitle}
                </h2>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {copy.rewardsLead}
                </p>
                <Link
                  href={rewardsHref}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSignedIn ? copy.rewardsCta : copy.rewardsCtaSignIn}
                  <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </PublicGuestShell>
  )
}
