'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Play, RotateCcw, Sparkles } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Progress } from '@workspace/ui/components/progress'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import type {
  StyleAnalysisResult,
  StoryDraftResult,
  VisualBriefResult,
} from '@/lib/playbooks/client-api'

export type BriefProgress = {
  current: number
  total: number
  name: string
}

export type BriefHolidayItem = {
  id: string
  date: string
  name: string
  storyDraft: StoryDraftResult
}

export type BriefItemStatus = 'pending' | 'loading' | 'ready' | 'error'

export type BriefHistoryEntry =
  | { role: 'assistant'; result: VisualBriefResult }
  | { role: 'user'; feedback: string }

export type ConfirmedVisualBrief = BriefHolidayItem & {
  result: VisualBriefResult
}

export type StyleReference = {
  name: string
}

type PublicHolidaysVisualBriefsProps = {
  holidays: BriefHolidayItem[]
  statuses: Record<string, BriefItemStatus>
  results: Record<string, VisualBriefResult>
  histories: Record<string, BriefHistoryEntry[]>
  confirmedBriefs: ConfirmedVisualBrief[]
  instructions: string
  onInstructionsChange: (value: string) => void
  styleReference: StyleReference | null
  onStyleReferenceChange: (value: StyleReference | null) => void
  styleAnalysis: StyleAnalysisResult | null
  styleAnalyzing: boolean
  onAnalyzeStyle: () => void
  running: boolean
  progress: BriefProgress | null
  formatDate: (iso: string) => string
  onGenerate: () => void
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
  onRetry: (id: string) => void
  onRegenerate: (id: string, feedback: string) => void
  onRemoveConfirmed: (id: string) => void
}

function BriefResultBody({
  result,
  labels,
}: {
  result: VisualBriefResult
  labels: {
    scene: string
    mood: string
    composition: string
    leonardoPrompt: string
  }
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-muted-foreground text-xs font-medium">{labels.scene}</p>
        <p className="text-sm whitespace-pre-wrap">{result.scene}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium">{labels.mood}</p>
        <p className="text-sm whitespace-pre-wrap">{result.mood}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium">{labels.composition}</p>
        <p className="text-sm whitespace-pre-wrap">{result.composition}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium">{labels.leonardoPrompt}</p>
        <p className="text-sm whitespace-pre-wrap">{result.leonardoPrompt}</p>
      </div>
    </div>
  )
}

export function PublicHolidaysVisualBriefs({
  holidays,
  statuses,
  results,
  histories,
  confirmedBriefs,
  instructions,
  onInstructionsChange,
  styleReference,
  onStyleReferenceChange,
  styleAnalysis,
  styleAnalyzing,
  onAnalyzeStyle,
  running,
  progress,
  formatDate,
  onGenerate,
  onConfirm,
  onSkip,
  onRetry,
  onRegenerate,
  onRemoveConfirmed,
}: PublicHolidaysVisualBriefsProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace.visualBriefs')
  const instructionsId = useId()
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

  const selectedImage = styleReference
    ? { name: styleReference.name, url: mediaDownloadHref(styleReference.name) }
    : null

  const generateDisabled = running || styleAnalyzing || !styleAnalysis || holidays.length === 0
  const analyzeDisabled = running || styleAnalyzing || !styleReference
  const progressValue =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  const fieldLabels = {
    scene: t('sceneLabel'),
    mood: t('moodLabel'),
    composition: t('compositionLabel'),
    leonardoPrompt: t('leonardoPromptLabel'),
  }

  function handleSelectMedia(item: MediaCatalogItem) {
    onStyleReferenceChange({ name: item.name })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-4 py-4">
        <CardHeader>
          <CardTitle className="text-sm">{t('settingsTitle')}</CardTitle>
          <CardDescription>{t('settingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>{t('styleReferenceLabel')}</FieldLabel>
              <MediaCatalogPicker
                selectedImage={selectedImage}
                onSelect={handleSelectMedia}
                onClear={() => onStyleReferenceChange(null)}
                pickLabel={t('styleReferencePick')}
                pickerAriaLabel={t('styleReferencePickerAria')}
                emptyLabel={t('styleReferenceEmpty')}
                removeLabel={t('styleReferenceRemove')}
                fromMediaLabel={t('styleReferenceFromMedia')}
              />
              <FieldDescription>{t('styleReferenceHint')}</FieldDescription>
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                {styleAnalysis ? t('styleReadyHint') : t('styleAnalyzeHint')}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={onAnalyzeStyle}
                disabled={analyzeDisabled}
              >
                {styleAnalyzing ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Sparkles data-icon="inline-start" />
                )}
                {styleAnalyzing ? t('analyzing') : t('analyze')}
              </Button>
            </div>

            {styleAnalysis ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-sm font-medium">{t('styleAnalysisTitle')}</p>
                <p className="text-sm whitespace-pre-wrap">{styleAnalysis.summary}</p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">
                      {t('paletteLabel')}
                    </dt>
                    <dd className="whitespace-pre-wrap">{styleAnalysis.palette}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">
                      {t('lightingLabel')}
                    </dt>
                    <dd className="whitespace-pre-wrap">{styleAnalysis.lighting}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">
                      {t('mediumLabel')}
                    </dt>
                    <dd className="whitespace-pre-wrap">{styleAnalysis.medium}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">{t('avoidLabel')}</dt>
                    <dd className="whitespace-pre-wrap">{styleAnalysis.avoid}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor={instructionsId}>{t('instructionsLabel')}</FieldLabel>
              <Textarea
                id={instructionsId}
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder={t('instructionsPlaceholder')}
                disabled={running || styleAnalyzing}
                maxLength={2000}
                rows={3}
                className="min-h-20 resize-y"
              />
              <FieldDescription>{t('instructionsHint')}</FieldDescription>
            </Field>
          </FieldGroup>

          {progress ? (
            <div className="flex flex-col gap-2" aria-live="polite">
              <p className="text-muted-foreground text-sm">
                {t('progressStatus', {
                  name: progress.name,
                  current: progress.current,
                  total: progress.total,
                })}
              </p>
              <Progress value={progressValue} aria-label={t('progressAria')} />
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="button" onClick={onGenerate} disabled={generateDisabled}>
            {running ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {running ? t('generating') : t('generate')}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{t('candidatesTitle')}</CardTitle>
              <Badge variant="outline" className="font-normal">
                {t('candidatesCount', { count: holidays.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                  const history = histories[item.id] ?? []
                  const isRevising = revisingId === item.id
                  const feedback = feedbackById[item.id] ?? ''
                  const feedbackTrimmed = feedback.trim()
                  const showResult =
                    Boolean(result) &&
                    (status === 'ready' || status === 'loading' || status === 'error')
                  const showHistoryTabs = history.length > 0 && showResult && result

                  return (
                    <li key={item.id} className="flex flex-col gap-3 px-3 py-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {formatDate(item.date)}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                            {item.storyDraft.caption}
                          </p>
                        </div>
                        {status === 'loading' ? (
                          <Spinner className="size-4 shrink-0" aria-label={t('draftingAria')} />
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

                      {showHistoryTabs && result ? (
                        <Tabs defaultValue="current" className="gap-3">
                          <TabsList variant="line" className="w-full">
                            <TabsTrigger value="current">{t('tabCurrent')}</TabsTrigger>
                            <TabsTrigger value="history">{t('tabHistory')}</TabsTrigger>
                          </TabsList>
                          <TabsContent value="current">
                            <div
                              className={cn(
                                'flex flex-col gap-2 rounded-lg bg-muted/40 p-3',
                                status === 'loading' && 'opacity-60',
                              )}
                            >
                              <BriefResultBody result={result} labels={fieldLabels} />
                            </div>
                          </TabsContent>
                          <TabsContent value="history">
                            <ol className="flex flex-col gap-2" aria-label={t('tabHistory')}>
                              {history.map((entry, index) => {
                                if (entry.role === 'assistant') {
                                  return (
                                    <li
                                      key={`assistant-${index}`}
                                      className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3"
                                      aria-label={t('historyAssistantLabel')}
                                    >
                                      <p className="text-muted-foreground text-xs font-medium">
                                        {t('historyAssistantLabel')}
                                      </p>
                                      <BriefResultBody result={entry.result} labels={fieldLabels} />
                                    </li>
                                  )
                                }
                                return (
                                  <li
                                    key={`user-${index}`}
                                    className="ml-4 flex flex-col gap-1 rounded-lg border border-border/60 bg-background p-3"
                                    aria-label={t('historyUserLabel')}
                                  >
                                    <p className="text-muted-foreground text-xs font-medium">
                                      {t('historyUserLabel')}
                                    </p>
                                    <p className="text-sm whitespace-pre-wrap">{entry.feedback}</p>
                                  </li>
                                )
                              })}
                            </ol>
                          </TabsContent>
                        </Tabs>
                      ) : showResult && result ? (
                        <div
                          className={cn(
                            'flex flex-col gap-2 rounded-lg bg-muted/40 p-3',
                            status === 'loading' && 'opacity-60',
                          )}
                        >
                          <BriefResultBody result={result} labels={fieldLabels} />
                        </div>
                      ) : null}

                      {status === 'error' ? (
                        <Alert variant="destructive">
                          <AlertTitle>{t('briefErrorTitle')}</AlertTitle>
                          <AlertDescription>{t('briefError')}</AlertDescription>
                        </Alert>
                      ) : null}

                      {isRevising && (status === 'ready' || status === 'error') ? (
                        <FieldGroup className="gap-2 rounded-lg border border-border/60 p-3">
                          <Field>
                            <FieldLabel htmlFor={`ph-brief-feedback-${item.id}`}>
                              {t('feedbackLabel')}
                            </FieldLabel>
                            <Textarea
                              id={`ph-brief-feedback-${item.id}`}
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
                            <FieldDescription>{t('feedbackHint')}</FieldDescription>
                          </Field>
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
                        </FieldGroup>
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
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{t('confirmedTitle')}</CardTitle>
              <Badge variant="outline" className="font-normal">
                {t('confirmedCount', { count: confirmedBriefs.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {confirmedBriefs.length === 0 ? (
              <Empty className="border border-dashed border-border/70 py-8 md:py-10">
                <EmptyHeader>
                  <EmptyTitle>{t('confirmedEmptyTitle')}</EmptyTitle>
                  <EmptyDescription>{t('confirmedEmptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                {confirmedBriefs.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(item.date)}
                      </p>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{item.result.scene}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
