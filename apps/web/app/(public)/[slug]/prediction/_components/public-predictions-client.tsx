'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Button } from '@workspace/ui/components/button'
import { buildLoginUrl } from '@/lib/auth-return-path'
import { REWARD_MODE_POINTS, type Prediction } from '@/lib/graphql/queries/predictions'
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
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{t('lead')}</p>
      </div>

      {predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {predictions.map((prediction) => {
            const votedOutcomeId = prediction.myVote?.outcomeId ?? null
            return (
              <li key={prediction.id} className="rounded-md border border-border px-3 py-3">
                <p className="text-sm font-medium">{prediction.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {prediction.rewardMode === REWARD_MODE_POINTS
                    ? t('rewardPoints', {
                        correct: prediction.pointsForCorrect,
                        vote: prediction.pointsForVote,
                      })
                    : t('rewardSocial')}
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
                        disabled={!isLoaded || votedOutcomeId != null || busyKey != null}
                        onClick={() => void handleVote(prediction.id, outcome.id)}
                      >
                        {busy ? t('voting') : outcome.label}
                        {selected ? ` · ${t('yourPick')}` : ''}
                      </Button>
                    )
                  })}
                </div>
                {isLoaded && !isSignedIn ? (
                  <p className="mt-2 text-xs text-muted-foreground">{t('signInHint')}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </main>
  )
}
