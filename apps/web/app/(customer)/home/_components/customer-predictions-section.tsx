'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { REWARD_MODE_POINTS, type Prediction } from '@/lib/graphql/queries/predictions'

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
          {predictions.map((prediction) => {
            const votedOutcomeId = prediction.myVote?.outcomeId ?? null
            return (
              <li key={prediction.id} className="rounded-md border border-border px-3 py-3">
                <p className="text-sm font-medium">{prediction.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {prediction.locationName}
                  {' · '}
                  {prediction.rewardMode === REWARD_MODE_POINTS
                    ? t('predictionsRewardPoints', {
                        correct: prediction.pointsForCorrect,
                        vote: prediction.pointsForVote,
                      })
                    : t('predictionsRewardSocial')}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {prediction.outcomes.map((outcome) => {
                    const selected = votedOutcomeId === outcome.id
                    const busy = busyKey === `${prediction.id}:${outcome.id}`
                    return (
                      <Button
                        key={outcome.id}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-auto min-h-10 justify-start whitespace-normal text-left"
                        disabled={votedOutcomeId != null || busyKey != null}
                        onClick={() => void handleVote(prediction.id, outcome.id)}
                      >
                        {busy ? t('predictionsVoting') : outcome.label}
                        {selected ? ` · ${t('predictionsYourPick')}` : ''}
                      </Button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
    </section>
  )
}
