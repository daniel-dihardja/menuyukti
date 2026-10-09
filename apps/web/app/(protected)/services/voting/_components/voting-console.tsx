'use client'

import { useEffect, useState } from 'react'
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
import { GuestSurfacePreview } from '@/components/services/guest-surface-preview'
import { type Voting } from '@/lib/graphql/queries/votings'
import { routes } from '@/lib/routes'

type Props = {
  locationId: number
  initialPublicSlug: string | null
  initialVotings: Voting[]
  pointSystemActive: boolean
}

export function VotingConsole({
  locationId,
  initialPublicSlug,
  initialVotings,
  pointSystemActive,
}: Props) {
  const t = useTranslations('services.voting.console')
  const router = useRouter()
  const [votings, setVotings] = useState(initialVotings)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [pointsForVote, setPointsForVote] = useState('5')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [previewNonce, setPreviewNonce] = useState(0)

  useEffect(() => {
    setVotings(initialVotings)
  }, [initialVotings])

  const locationSlug = initialPublicSlug?.trim() || ''
  const liveHomePath = locationSlug ? routes.public.locationHome(locationSlug) : null
  const liveVotingPath = locationSlug ? routes.public.locationVoting(locationSlug) : null
  const locationBasicsHref = routes.analytics.branchesDetail(locationId)

  function bumpPreview() {
    setPreviewNonce((n) => n + 1)
  }

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
    const labels = options.map((o) => o.trim()).filter(Boolean)
    if (labels.length < 2) {
      setCreateError(t('optionsRequired'))
      return
    }
    if (!pointSystemActive) {
      setCreateError(t('pointsRequiredHint'))
      return
    }
    const votePts = Number(pointsForVote)
    if (!Number.isInteger(votePts) || votePts < 1) {
      setCreateError(t('pointsModePointsRequired'))
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/services/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          question: q,
          options: labels,
          pointsForVote: votePts,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('createFailed'))
      }
      const created = (await res.json()) as Voting
      setVotings((prev) => [created, ...prev])
      setQuestion('')
      setOptions(['', ''])
      bumpPreview()
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('createFailed'))
    } finally {
      setCreating(false)
    }
  }

  async function handleClose(votingId: number) {
    setActionError(null)
    setBusyId(votingId)
    try {
      const res = await fetch('/api/services/voting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', votingId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('closeFailed'))
      }
      const updated = (await res.json()) as Voting
      setVotings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      bumpPreview()
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('closeFailed'))
    } finally {
      setBusyId(null)
    }
  }

  function statusBadge(status: string) {
    if (status === 'open') return <Badge variant="secondary">{t('statusOpen')}</Badge>
    return <Badge variant="outline">{t('statusClosed')}</Badge>
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-6">
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
                <FieldLabel htmlFor="voting-home-url">{t('locationHomeUrl')}</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="voting-home-url"
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
            {liveVotingPath ? (
              <Field>
                <FieldLabel htmlFor="voting-page-url">{t('votingUrl')}</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="voting-page-url"
                    value={liveVotingPath}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopyPath(liveVotingPath, 'voting')}
                  >
                    {copiedKey === 'voting' ? t('copiedLink') : t('copyLink')}
                  </Button>
                  <Button asChild type="button" variant="ghost">
                    <Link href={liveVotingPath} target="_blank" rel="noreferrer">
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
              <FieldLabel htmlFor="voting-question">{t('questionLabel')}</FieldLabel>
              <Input
                id="voting-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('questionPlaceholder')}
                disabled={creating}
              />
            </Field>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('optionsLabel')}</FieldLabel>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))
                    }
                    placeholder={t('optionPlaceholder', { index: index + 1 })}
                    disabled={creating}
                  />
                  {options.length > 2 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                      disabled={creating}
                    >
                      {t('removeOption')}
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={() => setOptions((prev) => [...prev, ''])}
                disabled={creating}
              >
                {t('addOption')}
              </Button>
            </div>
            {!pointSystemActive ? (
              <div className="bg-muted/50 flex flex-col gap-2 rounded-md border border-border px-3 py-3">
                <p className="text-sm">{t('pointsRequiredHint')}</p>
                <Button asChild type="button" variant="secondary" className="w-fit">
                  <Link href={routes.servicesPointSystemLocation(locationId)}>
                    {t('enablePointSystemCta')}
                  </Link>
                </Button>
              </div>
            ) : (
              <Field>
                <FieldLabel htmlFor="voting-vote-pts">{t('pointsForVoteLabel')}</FieldLabel>
                <Input
                  id="voting-vote-pts"
                  type="number"
                  min={1}
                  step={1}
                  value={pointsForVote}
                  onChange={(e) => setPointsForVote(e.target.value)}
                  disabled={creating}
                />
                <p className="text-muted-foreground text-xs">{t('pointsHelp')}</p>
              </Field>
            )}
            {createError ? <p className="text-destructive text-sm">{createError}</p> : null}
            <Button
              type="button"
              className="w-fit"
              onClick={() => void handleCreate()}
              disabled={creating || !pointSystemActive}
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
            {votings.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('listEmpty')}</p>
            ) : (
              <ul className="divide-border divide-y">
                {votings.map((voting) => {
                  const busy = busyId === voting.id
                  return (
                    <li key={voting.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="text-sm font-medium">{voting.question}</p>
                          <p className="text-muted-foreground text-xs">
                            {t('voteCount', { count: voting.voteCount })} ·{' '}
                            {t('pointsSummary', { vote: voting.pointsForVote })}
                          </p>
                        </div>
                        {statusBadge(voting.status)}
                      </div>
                      <ul className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                        {voting.options.map((option) => (
                          <li key={option.id} className="border-border rounded-md border px-2 py-1">
                            {option.label}
                          </li>
                        ))}
                      </ul>
                      {voting.status === 'open' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          disabled={busy}
                          onClick={() => void handleClose(voting.id)}
                        >
                          {busy ? t('closing') : t('closeCta')}
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <GuestSurfacePreview
        livePath={liveVotingPath}
        previewKey={previewNonce}
        title={t('previewTitle')}
        openLabel={t('previewOpen')}
        placeholder={
          !locationSlug ? (
            <p>
              {t('slugMissingHint')}{' '}
              <Link
                href={locationBasicsHref}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t('editLocationBasics')}
              </Link>
            </p>
          ) : (
            <p>{t('previewPlaceholder')}</p>
          )
        }
      />
    </div>
  )
}
