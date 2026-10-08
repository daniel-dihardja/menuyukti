'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import {
  PredictionOutcomeCard,
  type PredictionOutcomeCardLabels,
} from '@/components/predictions/prediction-outcome-card'
import { buildLoginUrl } from '@/lib/auth-return-path'
import { type Prediction } from '@/lib/graphql/queries/predictions'
import { routes } from '@/lib/routes'

type Props = {
  slug: string
  locationName: string
  predictions: Prediction[]
}

export function PublicPredictionsClient({ slug, locationName, predictions: initial }: Props) {
  const t = useTranslations('public.prediction')
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [predictions, setPredictions] = useState(initial)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const returnPath = routes.public.locationPrediction(slug)

  async function handleVote(predictionId: number, outcomeId: number) {
    if (!isSignedIn) {
      router.push(buildLoginUrl(returnPath))
      return
    }
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
        throw new Error(body?.message || t('voteFailed'))
      }
      const updated = (await res.json()) as Prediction
      setPredictions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('voteFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  function labelsFor(prediction: Prediction): PredictionOutcomeCardLabels {
    return {
      yourPick: t('yourPick'),
      voting: t('voting'),
      rewardSocial: t('rewardSocial'),
      rewardPoints: t('rewardPoints', {
        correct: prediction.pointsForCorrect,
        vote: prediction.pointsForVote,
      }),
      statusClosed: t('statusClosed'),
      statusResolved: t('statusResolved'),
      awaitingResult: t('awaitingResult'),
      youWereCorrect: t('youWereCorrect'),
      youWereIncorrect: t('youWereIncorrect'),
      winnerLabel: t('winnerLabel'),
      voteCount: t('voteCount', { count: prediction.voteCount }),
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link
            href={routes.public.locationHome(slug)}
            className="underline-offset-4 hover:underline"
          >
            {locationName}
          </Link>
        </p>
        <h1 className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {isLoaded && !isSignedIn ? t('leadSignedOut') : t('lead')}
        </p>
      </div>

      {predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {predictions.map((prediction) => (
            <PredictionOutcomeCard
              key={prediction.id}
              prediction={prediction}
              labels={labelsFor(prediction)}
              busyKey={busyKey}
              voteDisabled={!isLoaded}
              onVote={(outcomeId) => void handleVote(prediction.id, outcomeId)}
              footer={
                isLoaded && !isSignedIn && prediction.status === 'open' && !prediction.myVote ? (
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
