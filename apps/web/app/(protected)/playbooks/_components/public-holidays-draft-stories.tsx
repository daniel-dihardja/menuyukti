'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Play, RotateCcw } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Label } from '@workspace/ui/components/label'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

import type { StoryDraftResult } from '@/lib/playbooks/client-api'

export type DraftHolidayItem = {
  id: string
  date: string
  name: string
}

export type DraftItemStatus = 'pending' | 'loading' | 'ready' | 'error'

export type ConfirmedStoryDraft = DraftHolidayItem & {
  result: StoryDraftResult
}

type PublicHolidaysDraftStoriesProps = {
  holidays: DraftHolidayItem[]
  statuses: Record<string, DraftItemStatus>
  results: Record<string, StoryDraftResult>
  confirmedDrafts: ConfirmedStoryDraft[]
  instructions: string
  onInstructionsChange: (value: string) => void
  running: boolean
  onGenerate: () => void
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
  onRetry: (id: string) => void
  onRegenerate: (id: string, feedback: string) => void
  onRemoveConfirmed: (id: string) => void
}

export function PublicHolidaysDraftStories({
  holidays,
  statuses,
  results,
  confirmedDrafts,
  instructions,
  onInstructionsChange,
  running,
  onGenerate,
  onConfirm,
  onSkip,
  onRetry,
  onRegenerate,
  onRemoveConfirmed,
}: PublicHolidaysDraftStoriesProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace.draft')
  const instructionsId = useId()
  const instructionsHintId = `${instructionsId}-hint`
  const [revisingId, setRevisingId] = useState<string | null>(null)
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({})
  const statusesRef = useRef(statuses)
  useEffect(() => {
    const prevStatuses = statusesRef.current
    statusesRef.current = statuses
    if (revisingId === null) return
    const prev = prevStatuses[revisingId]
    const next = statuses[revisingId]
    if (prev === 'loading' && next === 'ready') {
      setRevisingId(null)
      setFeedbackById((prevMap) => {
        if (!(revisingId in prevMap)) return prevMap
        const nextMap = { ...prevMap }
        delete nextMap[revisingId]
        return nextMap
      })
    }
  }, [statuses, revisingId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 p-4">
        <Label htmlFor={instructionsId} className="text-sm font-medium">
          {t('instructionsLabel')}
        </Label>
        <Textarea
          id={instructionsId}
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder={t('instructionsPlaceholder')}
          disabled={running}
          maxLength={2000}
          rows={3}
          className="min-h-20 resize-y"
          aria-describedby={instructionsHintId}
        />
        <p id={instructionsHintId} className="text-muted-foreground text-xs">
          {t('instructionsHint')}
        </p>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onGenerate}
            disabled={running || holidays.length === 0}
          >
            {running ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {running ? t('generating') : t('generate')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 p-4"
          aria-labelledby="ph-draft-candidates-heading"
        >
          <div className="flex items-center gap-2">
            <h2 id="ph-draft-candidates-heading" className="text-sm font-semibold">
              {t('candidatesTitle')}
            </h2>
            <Badge variant="outline" className="font-normal">
              {t('candidatesCount', { count: holidays.length })}
            </Badge>
          </div>

          {holidays.length === 0 ? (
            <Empty className="border border-dashed border-border/70 py-8 md:py-10">
              <EmptyHeader>
                <EmptyTitle>{t('candidatesEmptyTitle')}</EmptyTitle>
                <EmptyDescription>{t('candidatesEmptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {holidays.map((item) => {
                const status = statuses[item.id] ?? 'pending'
                const result = results[item.id]
                const isRevising = revisingId === item.id
                const feedback = feedbackById[item.id] ?? ''
                const feedbackTrimmed = feedback.trim()
                const showResult = Boolean(result) && (status === 'ready' || status === 'loading' || status === 'error')
                return (
                  <li key={item.id} className="flex flex-col gap-3 px-3 py-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs tabular-nums">{item.date}</p>
                      </div>
                      {status === 'loading' ? (
                        <Spinner className="size-4 shrink-0" />
                      ) : status === 'pending' ? (
                        <Badge variant="outline" className="shrink-0 font-normal">
                          {t('statusPending')}
                        </Badge>
                      ) : status === 'error' ? (
                        <Badge variant="destructive" className="shrink-0 font-normal">
                          {t('statusError')}
                        </Badge>
                      ) : null}
                    </div>

                    {showResult && result ? (
                      <div
                        className={cn(
                          'flex flex-col gap-2 rounded-lg bg-muted/40 p-3',
                          status === 'loading' && 'opacity-60',
                        )}
                      >
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            {t('captionLabel')}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{result.caption}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            {t('visualBriefLabel')}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{result.visualBrief}</p>
                        </div>
                      </div>
                    ) : null}

                    {status === 'error' ? (
                      <p className="text-destructive text-xs" role="alert">
                        {t('draftError')}
                      </p>
                    ) : null}

                    {isRevising && (status === 'ready' || status === 'error') ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
                        <Label
                          htmlFor={`ph-draft-feedback-${item.id}`}
                          className="text-sm font-medium"
                        >
                          {t('feedbackLabel')}
                        </Label>
                        <Textarea
                          id={`ph-draft-feedback-${item.id}`}
                          value={feedback}
                          onChange={(e) =>
                            setFeedbackById((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          placeholder={t('feedbackPlaceholder')}
                          disabled={running}
                          maxLength={1000}
                          rows={3}
                          className="min-h-16 resize-y"
                        />
                        <p className="text-muted-foreground text-xs">{t('feedbackHint')}</p>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={running}
                            onClick={() => {
                              setRevisingId(null)
                              setFeedbackById((prev) => {
                                const next = { ...prev }
                                delete next[item.id]
                                return next
                              })
                            }}
                          >
                            {t('cancelRevise')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={running || feedbackTrimmed.length === 0}
                            onClick={() => onRegenerate(item.id, feedbackTrimmed)}
                          >
                            {running ? (
                              <Spinner data-icon="inline-start" />
                            ) : (
                              <RotateCcw data-icon="inline-start" />
                            )}
                            {running ? t('regenerating') : t('regenerate')}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2">
                      {status === 'error' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={running}
                          onClick={() => onRetry(item.id)}
                        >
                          <RotateCcw data-icon="inline-start" />
                          {t('retry')}
                        </Button>
                      ) : null}
                      {(status === 'ready' || (status === 'error' && result)) && !isRevising ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={running}
                          onClick={() => setRevisingId(item.id)}
                        >
                          {t('revise')}
                        </Button>
                      ) : null}
                      {status === 'ready' && !isRevising ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={running}
                          onClick={() => onConfirm(item.id)}
                        >
                          {t('confirm')}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={running || status === 'loading'}
                        onClick={() => {
                          if (revisingId === item.id) setRevisingId(null)
                          onSkip(item.id)
                        }}
                      >
                        {t('skip')}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 p-4"
          aria-labelledby="ph-draft-confirmed-heading"
        >
          <div className="flex items-center gap-2">
            <h2 id="ph-draft-confirmed-heading" className="text-sm font-semibold">
              {t('confirmedTitle')}
            </h2>
            <Badge variant="outline" className="font-normal">
              {t('confirmedCount', { count: confirmedDrafts.length })}
            </Badge>
          </div>

          {confirmedDrafts.length === 0 ? (
            <Empty className="border border-dashed border-border/70 py-8 md:py-10">
              <EmptyHeader>
                <EmptyTitle>{t('confirmedEmptyTitle')}</EmptyTitle>
                <EmptyDescription>{t('confirmedEmptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {confirmedDrafts.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">{item.date}</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{item.result.caption}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={running}
                    onClick={() => onRemoveConfirmed(item.id)}
                  >
                    {t('remove')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
