'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  REWARD_MODE_POINTS,
  REWARD_MODE_SOCIAL,
  type Prediction,
  type PredictionRewardMode,
} from '@/lib/graphql/queries/predictions'
import { routes } from '@/lib/routes'

type Props = {
  locationId: number
  initialPublicSlug: string | null
  initialPredictions: Prediction[]
  pointSystemActive: boolean
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultClosesAtLocal(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return toLocalDatetimeValue(d.toISOString())
}

export function PredictionConsole({
  locationId,
  initialPublicSlug,
  initialPredictions,
  pointSystemActive,
}: Props) {
  const t = useTranslations('services.prediction.console')
  const router = useRouter()
  const [predictions, setPredictions] = useState(initialPredictions)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [closesAt, setClosesAt] = useState(defaultClosesAtLocal)
  const [outcomes, setOutcomes] = useState(['', ''])
  const [rewardMode, setRewardMode] = useState<PredictionRewardMode>(REWARD_MODE_SOCIAL)
  const [pointsForVote, setPointsForVote] = useState('0')
  const [pointsForCorrect, setPointsForCorrect] = useState('20')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [resolvePick, setResolvePick] = useState<Record<number, string>>({})

  const locationSlug = initialPublicSlug?.trim() || ''
  const liveHomePath = locationSlug ? routes.public.locationHome(locationSlug) : null
  const livePredictionPath = locationSlug ? routes.public.locationPrediction(locationSlug) : null
  const locationBasicsHref = routes.analytics.branchesDetail(locationId)

  async function handleCopyPath(path: string, key: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      setCopiedKey(null)
    }
  }

  async function handleCreate() {
    setCreateError(null)
    const q = question.trim()
    if (!q) {
      setCreateError(t('questionRequired'))
      return
    }
    const labels = outcomes.map((o) => o.trim()).filter(Boolean)
    if (labels.length < 2) {
      setCreateError(t('outcomesRequired'))
      return
    }
    const closes = new Date(closesAt)
    if (Number.isNaN(closes.getTime()) || closes.getTime() <= Date.now()) {
      setCreateError(t('closesAtRequired'))
      return
    }
    const votePts = Number(pointsForVote)
    const correctPts = Number(pointsForCorrect)
    if (
      rewardMode === REWARD_MODE_POINTS &&
      (!Number.isInteger(votePts) ||
        votePts < 0 ||
        !Number.isInteger(correctPts) ||
        correctPts < 0 ||
        (votePts <= 0 && correctPts <= 0))
    ) {
      setCreateError(t('pointsModePointsRequired'))
      return
    }
    if (rewardMode === REWARD_MODE_POINTS && !pointSystemActive) {
      setCreateError(t('pointsRequiredHint'))
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/services/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          question: q,
          closesAt: closes.toISOString(),
          outcomes: labels,
          rewardMode,
          pointsForVote: rewardMode === REWARD_MODE_POINTS ? votePts : 0,
          pointsForCorrect: rewardMode === REWARD_MODE_POINTS ? correctPts : 0,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('createFailed'))
      }
      const created = (await res.json()) as Prediction
      setPredictions((prev) => [created, ...prev])
      setQuestion('')
      setOutcomes(['', ''])
      setClosesAt(defaultClosesAtLocal())
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('createFailed'))
    } finally {
      setCreating(false)
    }
  }

  async function handleClose(predictionId: number) {
    setActionError(null)
    setBusyId(predictionId)
    try {
      const res = await fetch('/api/services/prediction', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', predictionId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('closeFailed'))
      }
      const updated = (await res.json()) as Prediction
      setPredictions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('closeFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleResolve(predictionId: number) {
    setActionError(null)
    const winningOutcomeId = Number(resolvePick[predictionId])
    if (!Number.isInteger(winningOutcomeId) || winningOutcomeId < 1) return
    setBusyId(predictionId)
    try {
      const res = await fetch('/api/services/prediction', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          predictionId,
          winningOutcomeId,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('resolveFailed'))
      }
      const updated = (await res.json()) as Prediction
      setPredictions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('resolveFailed'))
    } finally {
      setBusyId(null)
    }
  }

  function statusBadge(status: string) {
    if (status === 'open') return <Badge variant="secondary">{t('statusOpen')}</Badge>
    if (status === 'closed') return <Badge variant="outline">{t('statusClosed')}</Badge>
    return <Badge>{t('statusResolved')}</Badge>
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('publicLinksTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!locationSlug ? (
            <p className="text-muted-foreground text-sm">
              {t('slugMissingHint')}{' '}
              <Link
                href={locationBasicsHref}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t('editLocationBasics')}
              </Link>
            </p>
          ) : null}
          {liveHomePath ? (
            <Field>
              <FieldLabel htmlFor="pred-home-url">{t('locationHomeUrl')}</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="pred-home-url"
                  value={liveHomePath}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyPath(liveHomePath, 'home')}
                >
                  {copiedKey === 'home' ? t('copiedLink') : t('copyLink')}
                </Button>
                <Button asChild type="button" variant="ghost">
                  <Link href={liveHomePath} target="_blank" rel="noreferrer">
                    {t('openLink')}
                  </Link>
                </Button>
              </div>
            </Field>
          ) : null}
          {livePredictionPath ? (
            <Field>
              <FieldLabel htmlFor="pred-page-url">{t('predictionUrl')}</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="pred-page-url"
                  value={livePredictionPath}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyPath(livePredictionPath, 'prediction')}
                >
                  {copiedKey === 'prediction' ? t('copiedLink') : t('copyLink')}
                </Button>
                <Button asChild type="button" variant="ghost">
                  <Link href={livePredictionPath} target="_blank" rel="noreferrer">
                    {t('openLink')}
                  </Link>
                </Button>
              </div>
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('createTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="pred-question">{t('questionLabel')}</FieldLabel>
            <Input
              id="pred-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('questionPlaceholder')}
              disabled={creating}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pred-closes">{t('closesAtLabel')}</FieldLabel>
            <Input
              id="pred-closes"
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              disabled={creating}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('outcomesLabel')}</FieldLabel>
            {outcomes.map((outcome, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={outcome}
                  onChange={(e) =>
                    setOutcomes((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))
                  }
                  placeholder={t('outcomePlaceholder', { index: index + 1 })}
                  disabled={creating}
                />
                {outcomes.length > 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOutcomes((prev) => prev.filter((_, i) => i !== index))}
                    disabled={creating}
                  >
                    {t('removeOutcome')}
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-fit"
              onClick={() => setOutcomes((prev) => [...prev, ''])}
              disabled={creating}
            >
              {t('addOutcome')}
            </Button>
          </div>
          <Field>
            <FieldLabel>{t('rewardModeLabel')}</FieldLabel>
            <Select
              value={rewardMode}
              onValueChange={(v) => setRewardMode(v as PredictionRewardMode)}
              disabled={creating}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={REWARD_MODE_SOCIAL}>{t('rewardModeSocial')}</SelectItem>
                <SelectItem value={REWARD_MODE_POINTS} disabled={!pointSystemActive}>
                  {t('rewardModePoints')}
                </SelectItem>
              </SelectContent>
            </Select>
            {!pointSystemActive ? (
              <p className="text-muted-foreground text-xs">{t('pointsRequiredHint')}</p>
            ) : null}
          </Field>
          {rewardMode === REWARD_MODE_POINTS ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pred-vote-pts">{t('pointsForVoteLabel')}</FieldLabel>
                <Input
                  id="pred-vote-pts"
                  type="number"
                  min={0}
                  step={1}
                  value={pointsForVote}
                  onChange={(e) => setPointsForVote(e.target.value)}
                  disabled={creating}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pred-correct-pts">{t('pointsForCorrectLabel')}</FieldLabel>
                <Input
                  id="pred-correct-pts"
                  type="number"
                  min={0}
                  step={1}
                  value={pointsForCorrect}
                  onChange={(e) => setPointsForCorrect(e.target.value)}
                  disabled={creating}
                />
              </Field>
              <p className="text-muted-foreground text-xs sm:col-span-2">{t('pointsHelp')}</p>
            </div>
          ) : null}
          {createError ? <p className="text-destructive text-sm">{createError}</p> : null}
          <Button
            type="button"
            className="w-fit"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? t('creating') : t('createCta')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('listTitle')}</CardTitle>
          {actionError ? (
            <CardDescription className="text-destructive">{actionError}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('listEmpty')}</p>
          ) : (
            <ul className="divide-border divide-y">
              {predictions.map((prediction) => {
                const busy = busyId === prediction.id
                return (
                  <li key={prediction.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-sm font-medium">{prediction.question}</p>
                        <p className="text-muted-foreground text-xs">
                          {t('voteCount', { count: prediction.voteCount })} ·{' '}
                          {prediction.rewardMode === REWARD_MODE_POINTS
                            ? t('rewardModePoints')
                            : t('rewardModeSocial')}
                        </p>
                      </div>
                      {statusBadge(prediction.status)}
                    </div>
                    <ul className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                      {prediction.outcomes.map((outcome) => (
                        <li key={outcome.id} className="border-border rounded-md border px-2 py-1">
                          {outcome.label}
                          {prediction.winningOutcomeId === outcome.id ? ' ✓' : ''}
                        </li>
                      ))}
                    </ul>
                    {prediction.status === 'open' || prediction.status === 'closed' ? (
                      <div className="flex flex-wrap items-end gap-2">
                        {prediction.status === 'open' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void handleClose(prediction.id)}
                          >
                            {busy ? t('closing') : t('closeCta')}
                          </Button>
                        ) : null}
                        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                          <FieldLabel className="text-xs">{t('winningOutcomeLabel')}</FieldLabel>
                          <Select
                            value={resolvePick[prediction.id] ?? ''}
                            onValueChange={(v) =>
                              setResolvePick((prev) => ({ ...prev, [prediction.id]: v }))
                            }
                            disabled={busy}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('winningOutcomePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {prediction.outcomes.map((outcome) => (
                                <SelectItem key={outcome.id} value={String(outcome.id)}>
                                  {outcome.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || !resolvePick[prediction.id]}
                          onClick={() => void handleResolve(prediction.id)}
                        >
                          {busy ? t('resolving') : t('resolveCta')}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
