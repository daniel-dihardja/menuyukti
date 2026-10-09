'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import {
  VotingOutcomeCard,
  type VotingOutcomeCardLabels,
} from '@/components/votings/voting-outcome-card'
import { type Voting } from '@/lib/graphql/queries/votings'

type Props = {
  votings: Voting[]
  loadError?: boolean
}

export function CustomerVotingsSection({ votings: initial, loadError = false }: Props) {
  const t = useTranslations('guestHome')
  const router = useRouter()
  const [votings, setVotings] = useState(initial)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVote(votingId: number, outcomeId: number) {
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
        throw new Error(body?.message || t('votingsVoteFailed'))
      }
      const updated = (await res.json()) as Voting
      setVotings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('votingsVoteFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  function labelsFor(voting: Voting): VotingOutcomeCardLabels {
    return {
      yourPick: t('votingsYourPick'),
      voting: t('votingsVoting'),
      rewardSocial: t('votingsRewardSocial'),
      rewardPoints: t('votingsRewardPoints', {
        correct: voting.pointsForCorrect,
        vote: voting.pointsForVote,
      }),
      statusClosed: t('votingsStatusClosed'),
      statusResolved: t('votingsStatusResolved'),
      awaitingResult: t('votingsAwaitingResult'),
      youWereCorrect: t('votingsYouWereCorrect'),
      youWereIncorrect: t('votingsYouWereIncorrect'),
      winnerLabel: t('votingsWinnerLabel'),
      voteCount: t('votingsVoteCount', { count: voting.voteCount }),
    }
  }

  return (
    <section
      aria-labelledby="customer-home-votings-heading"
      className="rounded-lg border border-border bg-canvas/40 px-4 py-5 sm:px-5"
    >
      <h2 id="customer-home-votings-heading" className="text-base font-semibold tracking-tight">
        {t('votingsTitle')}
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
        {t('votingsLead')}
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('votingsLoadError')}</p>
      ) : votings.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('votingsEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {votings.map((voting) => (
            <VotingOutcomeCard
              key={voting.id}
              voting={voting}
              labels={labelsFor(voting)}
              locationLine={voting.locationName}
              busyKey={busyKey}
              onVote={(outcomeId) => void handleVote(voting.id, outcomeId)}
            />
          ))}
        </ul>
      )}

      {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
    </section>
  )
}
