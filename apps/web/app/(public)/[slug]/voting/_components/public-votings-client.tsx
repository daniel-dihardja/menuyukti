'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useTranslations } from 'next-intl'

import {
  VotingOutcomeCard,
  type VotingOutcomeCardLabels,
} from '@/components/votings/voting-outcome-card'
import { buildLoginUrl } from '@/lib/auth-return-path'
import { type Voting } from '@/lib/graphql/queries/votings'
import { routes } from '@/lib/routes'

type Props = {
  slug: string
  votings: Voting[]
}

export function PublicVotingsClient({ slug, votings: initial }: Props) {
  const t = useTranslations('public.voting')
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [votings, setVotings] = useState(initial)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const returnPath = routes.public.locationVoting(slug)

  async function handleVote(votingId: number, outcomeId: number) {
    if (!isSignedIn) {
      router.push(buildLoginUrl(returnPath))
      return
    }
    setError(null)
    const key = `${votingId}:${outcomeId}`
    setBusyKey(key)
    try {
      const res = await fetch('/api/customer/votings/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingId, outcomeId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('voteFailed'))
      }
      const updated = (await res.json()) as Voting
      setVotings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('voteFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  function labelsFor(voting: Voting): VotingOutcomeCardLabels {
    return {
      yourPick: t('yourPick'),
      voting: t('voting'),
      rewardSocial: t('rewardSocial'),
      rewardPoints: t('rewardPoints', {
        correct: voting.pointsForCorrect,
        vote: voting.pointsForVote,
      }),
      statusClosed: t('statusClosed'),
      statusResolved: t('statusResolved'),
      awaitingResult: t('awaitingResult'),
      youWereCorrect: t('youWereCorrect'),
      youWereIncorrect: t('youWereIncorrect'),
      winnerLabel: t('winnerLabel'),
      voteCount: t('voteCount', { count: voting.voteCount }),
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10 sm:px-10 sm:py-14">
      <div className="space-y-2">
        <h2 className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('title')}
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {isLoaded && !isSignedIn ? t('leadSignedOut') : t('lead')}
        </p>
      </div>

      {votings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {votings.map((voting) => (
            <VotingOutcomeCard
              key={voting.id}
              voting={voting}
              labels={labelsFor(voting)}
              busyKey={busyKey}
              voteDisabled={!isLoaded}
              onVote={(outcomeId) => void handleVote(voting.id, outcomeId)}
              footer={
                isLoaded && !isSignedIn && voting.status === 'open' && !voting.myVote ? (
                  <p className="text-xs text-muted-foreground">{t('signInHint')}</p>
                ) : null
              }
            />
          ))}
        </ul>
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </main>
  )
}
