'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Play, RotateCcw } from 'lucide-react'

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Progress } from '@workspace/ui/components/progress'
import { Slider } from '@workspace/ui/components/slider'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import type { CritiqueSummary, StoryDraftResult } from '@/lib/playbooks/client-api'

export type DraftProgress = {
  current: number
  total: number
  name: string
}

export type DraftHolidayItem = {
  id: string
  date: string
  name: string
}

export type DraftItemStatus = 'pending' | 'loading' | 'ready' | 'error'

export type DraftHistoryEntry =
  | { role: 'assistant'; result: StoryDraftResult }
  | { role: 'user'; feedback: string }
  | { role: 'critique'; feedback: string; score: number; passed: boolean }

export type ConfirmedStoryDraft = DraftHolidayItem & {
  result: StoryDraftResult
}

export type DraftCritiqueSettings = {
  enabled: boolean
  prompt: string
  maxIterations: number
  minScore: number
}

type PublicHolidaysDraftStoriesProps = {
  holidays: DraftHolidayItem[]
  statuses: Record<string, DraftItemStatus>
  results: Record<string, StoryDraftResult>
  histories: Record<string, DraftHistoryEntry[]>
  critiqueSummaries: Record<string, CritiqueSummary>
  confirmedDrafts: ConfirmedStoryDraft[]
  instructions: string
  onInstructionsChange: (value: string) => void
  critique: DraftCritiqueSettings
  onCritiqueChange: (value: DraftCritiqueSettings) => void
  running: boolean
  progress: DraftProgress | null
  formatDate: (iso: string) => string
  onGenerate: () => void
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
  onRetry: (id: string) => void
  onRegenerate: (id: string, feedback: string) => void
  onRemoveConfirmed: (id: string) => void
}

function DraftResultBody({
  result,
  captionLabel,
}: {
  result: StoryDraftResult
  captionLabel: string
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium">{captionLabel}</p>
      <p className="text-sm whitespace-pre-wrap">{result.caption}</p>
    </div>
  )
}

export function PublicHolidaysDraftStories({
  holidays,
  statuses,
  results,
  histories,
  critiqueSummaries,
  confirmedDrafts,
  instructions,
  onInstructionsChange,
  critique,
  onCritiqueChange,
  running,
  progress,
  formatDate,
  onGenerate,
  onConfirm,
  onSkip,
  onRetry,
  onRegenerate,
  onRemoveConfirmed,
}: PublicHolidaysDraftStoriesProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace.draft')
  const instructionsId = useId()
  const critiqueEnabledId = useId()
  const critiquePromptId = useId()
  const [critiqueOpen, setCritiqueOpen] = useState(critique.enabled)
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

  const critiquePromptTrimmed = critique.prompt.trim()
  const generateDisabled =
    running || holidays.length === 0 || (critique.enabled && critiquePromptTrimmed.length === 0)
  const progressValue =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

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
              <FieldLabel htmlFor={instructionsId}>{t('instructionsLabel')}</FieldLabel>
              <Textarea
                id={instructionsId}
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder={t('instructionsPlaceholder')}
                disabled={running}
                maxLength={2000}
                rows={3}
                className="min-h-20 resize-y"
              />
              <FieldDescription>{t('instructionsHint')}</FieldDescription>
            </Field>

            <Collapsible open={critiqueOpen} onOpenChange={setCritiqueOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-between px-0 py-1 font-medium"
                >
                  {t('critiquePanelLabel')}
                  <ChevronDown
                    data-icon="inline-end"
                    className={cn('transition-transform', critiqueOpen && 'rotate-180')}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4 pt-3">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={critiqueEnabledId}>{t('critiqueEnabledLabel')}</FieldLabel>
                    <FieldDescription>{t('critiqueEnabledHint')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    id={critiqueEnabledId}
                    checked={critique.enabled}
                    onCheckedChange={(checked) => {
                      onCritiqueChange({ ...critique, enabled: checked })
                      if (checked) setCritiqueOpen(true)
                    }}
                    disabled={running}
                    aria-label={t('critiqueEnabledAria')}
                  />
                </Field>

                {critique.enabled ? (
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor={critiquePromptId}>{t('critiquePromptLabel')}</FieldLabel>
                      <Textarea
                        id={critiquePromptId}
                        value={critique.prompt}
                        onChange={(e) => onCritiqueChange({ ...critique, prompt: e.target.value })}
                        placeholder={t('critiquePromptPlaceholder')}
                        disabled={running}
                        maxLength={2000}
                        rows={3}
                        className="min-h-20 resize-y"
                      />
                      <FieldDescription>{t('critiquePromptHint')}</FieldDescription>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>{t('critiqueMaxIterationsLabel')}</FieldLabel>
                        <ToggleGroup
                          type="single"
                          value={String(critique.maxIterations)}
                          disabled={running}
                          onValueChange={(value) => {
                            if (!value) return
                            onCritiqueChange({
                              ...critique,
                              maxIterations: Number.parseInt(value, 10),
                            })
                          }}
                        >
                          <ToggleGroupItem value="1">1</ToggleGroupItem>
                          <ToggleGroupItem value="2">2</ToggleGroupItem>
                          <ToggleGroupItem value="3">3</ToggleGroupItem>
                        </ToggleGroup>
                        <FieldDescription>{t('critiqueMaxIterationsHint')}</FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t('critiqueMinScoreLabel', { score: critique.minScore })}
                        </FieldLabel>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[critique.minScore]}
                          disabled={running}
                          onValueChange={(values) => {
                            const next = values[0]
                            if (next == null) return
                            onCritiqueChange({ ...critique, minScore: next })
                          }}
                        />
                        <FieldDescription>{t('critiqueMinScoreHint')}</FieldDescription>
                      </Field>
                    </div>
                  </FieldGroup>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
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
                  const critiqueSummary = critiqueSummaries[item.id]
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
                        ) : critiqueSummary ? (
                          <Badge
                            variant={critiqueSummary.passed ? 'secondary' : 'outline'}
                            className="shrink-0 font-normal"
                          >
                            {critiqueSummary.passed
                              ? t('critiquePassedBadge', { score: critiqueSummary.finalScore })
                              : t('critiqueFailedBadge', { score: critiqueSummary.finalScore })}
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
                              <DraftResultBody result={result} captionLabel={t('captionLabel')} />
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
                                      <DraftResultBody
                                        result={entry.result}
                                        captionLabel={t('captionLabel')}
                                      />
                                    </li>
                                  )
                                }
                                if (entry.role === 'critique') {
                                  return (
                                    <li
                                      key={`critique-${index}`}
                                      className="ml-4 flex flex-col gap-1 rounded-lg border border-border/60 bg-background p-3"
                                      aria-label={t('historyCritiqueLabel', { score: entry.score })}
                                    >
                                      <p className="text-muted-foreground text-xs font-medium">
                                        {t('historyCritiqueLabel', { score: entry.score })}
                                      </p>
                                      <p className="text-sm whitespace-pre-wrap">
                                        {entry.feedback}
                                      </p>
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
                          <DraftResultBody result={result} captionLabel={t('captionLabel')} />
                        </div>
                      ) : null}

                      {status === 'error' ? (
                        <Alert variant="destructive">
                          <AlertTitle>{t('draftErrorTitle')}</AlertTitle>
                          <AlertDescription>{t('draftError')}</AlertDescription>
                        </Alert>
                      ) : null}

                      {isRevising && (status === 'ready' || status === 'error') ? (
                        <FieldGroup className="gap-2 rounded-lg border border-border/60 p-3">
                          <Field>
                            <FieldLabel htmlFor={`ph-draft-feedback-${item.id}`}>
                              {t('feedbackLabel')}
                            </FieldLabel>
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
                {t('confirmedCount', { count: confirmedDrafts.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(item.date)}
                      </p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
