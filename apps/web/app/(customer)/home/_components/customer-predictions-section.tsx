'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import {
  PredictionOutcomeCard,
  type PredictionOutcomeCardLabels,
} from '@/components/predictions/prediction-outcome-card'
import { type Prediction } from '@/lib/graphql/queries/predictions'

type Props = {
  predictions: Prediction[]
  loadError?: boolean
}

export function CustomerPredictionsSection({ predictions: initial, loadError = false }: Props) {
  const t = useTranslations('guestHome')
  const router = useRouter()
  const [predictions, setPredictions] = useState(initial)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVote(predictionId: number, outcomeId: number) {
    setError(null)
    const key = `${predictionId}:${outcomeId}`
    setBusyKey(key)
    try {
      const res = await fetch('/api/customer/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId, outcomeId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('predictionsVoteFailed'))
      }
      const updated = (await res.json()) as Prediction
      setPredictions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('predictionsVoteFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  function labelsFor(prediction: Prediction): PredictionOutcomeCardLabels {
    return {
      yourPick: t('predictionsYourPick'),
      voting: t('predictionsVoting'),
      rewardSocial: t('predictionsRewardSocial'),
      rewardPoints: t('predictionsRewardPoints', {
        correct: prediction.pointsForCorrect,
        vote: prediction.pointsForVote,
      }),
      statusClosed: t('predictionsStatusClosed'),
      statusResolved: t('predictionsStatusResolved'),
      awaitingResult: t('predictionsAwaitingResult'),
      youWereCorrect: t('predictionsYouWereCorrect'),
      youWereIncorrect: t('predictionsYouWereIncorrect'),
      winnerLabel: t('predictionsWinnerLabel'),
      voteCount: t('predictionsVoteCount', { count: prediction.voteCount }),
    }
  }

  return (
    <section
      aria-labelledby="customer-home-predictions-heading"
      className="rounded-lg border border-border bg-canvas/40 px-4 py-5 sm:px-5"
    >
      <h2 id="customer-home-predictions-heading" className="text-base font-semibold tracking-tight">
        {t('predictionsTitle')}
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
        {t('predictionsLead')}
      </p>

      {loadError ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('predictionsLoadError')}</p>
      ) : predictions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('predictionsEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {predictions.map((prediction) => (
            <PredictionOutcomeCard
              key={prediction.id}
              prediction={prediction}
              labels={labelsFor(prediction)}
              locationLine={prediction.locationName}
              busyKey={busyKey}
              onVote={(outcomeId) => void handleVote(prediction.id, outcomeId)}
            />
          ))}
        </ul>
      )}

      {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
    </section>
  )
}
