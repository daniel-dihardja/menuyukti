'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarDays, Info, Play } from 'lucide-react'
import { toast } from 'sonner'

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
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'

import { PublicHolidaysDraftStories } from '@/app/(protected)/playbooks/_components/public-holidays-draft-stories'
import type {
  ConfirmedStoryDraft,
  DraftCritiqueSettings,
  DraftHistoryEntry,
  DraftItemStatus,
  DraftProgress,
} from '@/app/(protected)/playbooks/_components/public-holidays-draft-stories'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  draftHolidayStory,
  fetchHolidays,
  scoreHolidayRelevance,
  type CritiqueSummary,
  type StoryDraftResult,
} from '@/lib/playbooks/client-api'
import { relevantHolidayIds } from '@/lib/playbooks/relevant-holiday-ids'

type HolidayItem = {
  id: string
  date: string
  name: string
}

type StepId = 'fetchDates' | 'draftStories'

const STEP_IDS: StepId[] = ['fetchDates', 'draftStories']

const DEFAULT_CRITIQUE: DraftCritiqueSettings = {
  enabled: false,
  prompt: '',
  maxIterations: 2,
  minScore: 7,
}

function historyFromCritique(summary: CritiqueSummary): DraftHistoryEntry[] {
  const entries: DraftHistoryEntry[] = []
  for (const round of summary.rounds) {
    entries.push({ role: 'assistant', result: round.draft })
    entries.push({
      role: 'critique',
      feedback: round.verdict.feedback,
      score: round.verdict.score,
      passed: round.verdict.passed,
    })
  }
  return entries
}

function sortByDate<T extends HolidayItem>(items: T[]): T[] {
  return [...items].toSorted((a, b) => a.date.localeCompare(b.date))
}

function formatHolidayDate(iso: string, locale: string): string {
  const parts = iso.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(y, m - 1, d))
}

type PublicHolidaysWorkspaceProps = {
  /** Validate + persist form fields, then return the window to fetch. */
  prepareRun: () => Promise<{
    locationId: number
    startDate: string
    endDate: string
  }>
  onRunningChange?: (running: boolean) => void
}

export function PublicHolidaysWorkspace({
  prepareRun,
  onRunningChange,
}: PublicHolidaysWorkspaceProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace')
  const locale = useLocale()
  const aiRelevanceId = useId()
  const relevanceInstructionsId = useId()
  const [activeStepId, setActiveStepId] = useState<StepId>('fetchDates')
  const [candidates, setCandidates] = useState<HolidayItem[]>([])
  const [confirmed, setConfirmed] = useState<HolidayItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [hasRun, setHasRun] = useState(false)
  const [lastFetchEmpty, setLastFetchEmpty] = useState(false)
  const [running, setRunning] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [useAiRelevance, setUseAiRelevance] = useState(true)
  const [relevanceInstructions, setRelevanceInstructions] = useState('')
  const [draftInstructions, setDraftInstructions] = useState('')
  const [draftCritique, setDraftCritique] = useState<DraftCritiqueSettings>(DEFAULT_CRITIQUE)
  const [draftStatuses, setDraftStatuses] = useState<Record<string, DraftItemStatus>>({})
  const [draftResults, setDraftResults] = useState<Record<string, StoryDraftResult>>({})
  const [draftHistories, setDraftHistories] = useState<Record<string, DraftHistoryEntry[]>>({})
  const [draftCritiqueSummaries, setDraftCritiqueSummaries] = useState<
    Record<string, CritiqueSummary>
  >({})
  const [confirmedDrafts, setConfirmedDrafts] = useState<ConfirmedStoryDraft[]>([])
  const [skippedDraftIds, setSkippedDraftIds] = useState<Set<string>>(() => new Set())
  const [draftRunning, setDraftRunning] = useState(false)
  const [draftProgress, setDraftProgress] = useState<DraftProgress | null>(null)

  const draftStoriesEnabled = confirmed.length > 0
  const hasSessionWork =
    confirmed.length > 0 ||
    confirmedDrafts.length > 0 ||
    Object.keys(draftResults).length > 0 ||
    Object.keys(draftStatuses).length > 0

  useUnsavedChangesGuard(hasSessionWork)

  const confirmedDraftIds = useMemo(
    () => new Set(confirmedDrafts.map((d) => d.id)),
    [confirmedDrafts],
  )
  const draftQueue = confirmed.filter(
    (h) => !confirmedDraftIds.has(h.id) && !skippedDraftIds.has(h.id),
  )

  useEffect(() => {
    if (confirmed.length === 0 && activeStepId === 'draftStories') {
      setActiveStepId('fetchDates')
    }
  }, [confirmed.length, activeStepId])

  useEffect(() => {
    const confirmedIds = new Set(confirmed.map((h) => h.id))
    setConfirmedDrafts((prev) => prev.filter((d) => confirmedIds.has(d.id)))
    setSkippedDraftIds((prev) => {
      const next = new Set([...prev].filter((id) => confirmedIds.has(id)))
      return next.size === prev.size ? prev : next
    })
    setDraftStatuses((prev) => {
      const next: Record<string, DraftItemStatus> = {}
      for (const [id, status] of Object.entries(prev)) {
        if (confirmedIds.has(id)) next[id] = status
      }
      return next
    })
    setDraftResults((prev) => {
      const next: Record<string, StoryDraftResult> = {}
      for (const [id, result] of Object.entries(prev)) {
        if (confirmedIds.has(id)) next[id] = result
      }
      return next
    })
    setDraftHistories((prev) => {
      const next: Record<string, DraftHistoryEntry[]> = {}
      for (const [id, history] of Object.entries(prev)) {
        if (confirmedIds.has(id)) next[id] = history
      }
      return next
    })
  }, [confirmed])

  function setRunningState(next: boolean) {
    setRunning(next)
    onRunningChange?.(next)
  }

  function setDraftRunningState(next: boolean) {
    setDraftRunning(next)
    onRunningChange?.(next)
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectAllCandidates() {
    setSelectedIds(new Set(candidates.map((c) => c.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function keepItems(ids: string[]) {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const moving = candidates.filter((item) => idSet.has(item.id))
    if (moving.length === 0) return
    setCandidates((prev) => prev.filter((item) => !idSet.has(item.id)))
    setConfirmed((prev) => sortByDate([...prev, ...moving]))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }

  function skipItem(id: string) {
    const item = candidates.find((h) => h.id === id)
    if (!item) return
    setCandidates((prev) => prev.filter((h) => h.id !== id))
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast(t('skipUndoToast', { name: item.name }), {
      action: {
        label: t('undo'),
        onClick: () => {
          setCandidates((prev) => {
            if (prev.some((h) => h.id === item.id)) return prev
            return sortByDate([...prev, item])
          })
        },
      },
    })
  }

  function removeConfirmed(id: string) {
    const item = confirmed.find((h) => h.id === id)
    if (!item) return
    setConfirmed((prev) => prev.filter((h) => h.id !== id))
    setCandidates((prev) => sortByDate([...prev, item]))
  }

  async function handleRun() {
    if (running) return
    setRunningState(true)
    setFetchError(null)
    try {
      const ctx = await prepareRun()
      const holidays = await fetchHolidays({
        locationId: ctx.locationId,
        dateStart: ctx.startDate,
        dateEnd: ctx.endDate,
      })
      const confirmedIds = new Set(confirmed.map((h) => h.id))
      const nextCandidates = sortByDate(
        holidays
          .filter((h) => !confirmedIds.has(h.id))
          .map((h) => ({ id: h.id, date: h.date, name: h.name })),
      )

      let nextSelected = new Set<string>()
      if (useAiRelevance && nextCandidates.length > 0) {
        const scored = await scoreHolidayRelevance({
          locationId: ctx.locationId,
          holidays: holidays
            .filter((h) => !confirmedIds.has(h.id))
            .map((h) => ({
              id: h.id,
              date: h.date,
              name: h.name,
              localName: h.localName,
            })),
          instructions: relevanceInstructions,
        })
        nextSelected = relevantHolidayIds(scored, confirmedIds)
      }

      setCandidates(nextCandidates)
      setSelectedIds(nextSelected)
      setHasRun(true)
      setLastFetchEmpty(holidays.length === 0)
    } catch (err) {
      if (err instanceof Error && err.message === 'validation') {
        return
      }
      setFetchError(t('fetchError'))
      toast.error(err instanceof Error ? err.message : t('fetchError'))
    } finally {
      setRunningState(false)
    }
  }

  async function draftOne(locationId: number, holiday: HolidayItem): Promise<boolean> {
    setDraftStatuses((prev) => ({ ...prev, [holiday.id]: 'loading' }))
    try {
      const critiquePrompt = draftCritique.prompt.trim()
      const item = await draftHolidayStory({
        locationId,
        holiday: { id: holiday.id, date: holiday.date, name: holiday.name },
        instructions: draftInstructions,
        ...(draftCritique.enabled && critiquePrompt
          ? {
              critique: {
                prompt: critiquePrompt,
                maxIterations: draftCritique.maxIterations,
                minScore: draftCritique.minScore,
              },
            }
          : {}),
      })
      setDraftResults((prev) => ({ ...prev, [holiday.id]: item.result }))
      const critiqueSummary = item.critique
      if (critiqueSummary) {
        setDraftCritiqueSummaries((prev) => ({ ...prev, [holiday.id]: critiqueSummary }))
        setDraftHistories((prev) => ({
          ...prev,
          [holiday.id]: historyFromCritique(critiqueSummary),
        }))
      } else {
        setDraftCritiqueSummaries((prev) => {
          const next = { ...prev }
          delete next[holiday.id]
          return next
        })
        setDraftHistories((prev) => ({
          ...prev,
          [holiday.id]: [{ role: 'assistant', result: item.result }],
        }))
      }
      setDraftStatuses((prev) => ({ ...prev, [holiday.id]: 'ready' }))
      return true
    } catch (err) {
      setDraftStatuses((prev) => ({ ...prev, [holiday.id]: 'error' }))
      toast.error(err instanceof Error ? err.message : t('draft.generateError'))
      return false
    }
  }

  async function handleGenerateDrafts() {
    if (draftRunning || draftQueue.length === 0) return
    if (draftCritique.enabled && !draftCritique.prompt.trim()) return
    setDraftRunningState(true)
    const queue = [...draftQueue]
    try {
      const ctx = await prepareRun()
      for (let i = 0; i < queue.length; i++) {
        const holiday = queue[i]
        if (!holiday) continue
        setDraftProgress({ current: i + 1, total: queue.length, name: holiday.name })
        await draftOne(ctx.locationId, holiday)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'validation') {
        return
      }
      toast.error(err instanceof Error ? err.message : t('draft.generateError'))
    } finally {
      setDraftProgress(null)
      setDraftRunningState(false)
    }
  }

  async function handleRetryDraft(id: string) {
    if (draftRunning) return
    if (draftCritique.enabled && !draftCritique.prompt.trim()) return
    const holiday = draftQueue.find((h) => h.id === id)
    if (!holiday) return
    setDraftRunningState(true)
    setDraftProgress({ current: 1, total: 1, name: holiday.name })
    try {
      const ctx = await prepareRun()
      await draftOne(ctx.locationId, holiday)
    } catch (err) {
      if (err instanceof Error && err.message === 'validation') {
        return
      }
      toast.error(err instanceof Error ? err.message : t('draft.generateError'))
    } finally {
      setDraftProgress(null)
      setDraftRunningState(false)
    }
  }

  async function handleRegenerateDraft(id: string, feedback: string) {
    if (draftRunning) return
    const holiday = draftQueue.find((h) => h.id === id)
    const previousResult = draftResults[id]
    if (!holiday || !previousResult) return
    const feedbackTrimmed = feedback.trim()
    if (!feedbackTrimmed) return

    setDraftRunningState(true)
    setDraftStatuses((prev) => ({ ...prev, [id]: 'loading' }))
    setDraftProgress({ current: 1, total: 1, name: holiday.name })
    try {
      const ctx = await prepareRun()
      const item = await draftHolidayStory({
        locationId: ctx.locationId,
        holiday: { id: holiday.id, date: holiday.date, name: holiday.name },
        instructions: draftInstructions,
        previousResult,
        feedback: feedbackTrimmed,
      })
      setDraftResults((prev) => ({ ...prev, [id]: item.result }))
      setDraftCritiqueSummaries((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setDraftHistories((prev) => {
        const existing = prev[id] ?? []
        return {
          ...prev,
          [id]: [
            ...existing,
            { role: 'user', feedback: feedbackTrimmed },
            { role: 'assistant', result: item.result },
          ],
        }
      })
      setDraftStatuses((prev) => ({ ...prev, [id]: 'ready' }))
    } catch (err) {
      setDraftStatuses((prev) => ({ ...prev, [id]: 'error' }))
      if (err instanceof Error && err.message === 'validation') {
        return
      }
      toast.error(err instanceof Error ? err.message : t('draft.generateError'))
    } finally {
      setDraftProgress(null)
      setDraftRunningState(false)
    }
  }

  function confirmDraft(id: string) {
    const holiday = draftQueue.find((h) => h.id === id)
    const result = draftResults[id]
    if (!holiday || !result) return
    setConfirmedDrafts((prev) =>
      sortByDate([
        ...prev.filter((d) => d.id !== id),
        { id: holiday.id, date: holiday.date, name: holiday.name, result },
      ]),
    )
    setDraftStatuses((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftHistories((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftCritiqueSummaries((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function skipDraft(id: string) {
    const holiday = draftQueue.find((h) => h.id === id)
    if (!holiday) return
    setSkippedDraftIds((prev) => new Set(prev).add(id))
    setDraftStatuses((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftHistories((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftCritiqueSummaries((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    toast(t('draft.skipUndoToast', { name: holiday.name }), {
      action: {
        label: t('draft.undo'),
        onClick: () => {
          setSkippedDraftIds((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        },
      },
    })
  }

  function removeConfirmedDraft(id: string) {
    setConfirmedDrafts((prev) => prev.filter((d) => d.id !== id))
    setSkippedDraftIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const selectedCount = selectedIds.size

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t('workspaceHint')}</p>

      <Alert>
        <Info />
        <AlertTitle>{t('sessionAlertTitle')}</AlertTitle>
        <AlertDescription>{t('sessionAlertDescription')}</AlertDescription>
      </Alert>

      <Tabs
        value={activeStepId}
        onValueChange={(value) => {
          if (value === 'draftStories' && !draftStoriesEnabled) return
          if (STEP_IDS.includes(value as StepId)) {
            setActiveStepId(value as StepId)
          }
        }}
        className="gap-4"
      >
        <TabsList aria-label={t('stepsAria')}>
          {STEP_IDS.map((stepId) => {
            const enabled = stepId === 'fetchDates' || draftStoriesEnabled
            const badgeCount =
              stepId === 'fetchDates' ? confirmed.length : confirmedDrafts.length
            return (
              <TabsTrigger key={stepId} value={stepId} disabled={!enabled} className="gap-2">
                {t(`steps.${stepId}`)}
                {badgeCount > 0 ? (
                  <Badge variant="outline" className="h-5 min-w-5 justify-center px-1.5 font-normal">
                    {badgeCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="fetchDates" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card className="gap-4 py-4">
              <CardHeader className="gap-4 border-b pb-4">
                <FieldGroup className="gap-4">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={aiRelevanceId}>{t('aiRelevanceLabel')}</FieldLabel>
                      <FieldDescription>{t('aiRelevanceHint')}</FieldDescription>
                    </FieldContent>
                    <Switch
                      id={aiRelevanceId}
                      checked={useAiRelevance}
                      onCheckedChange={setUseAiRelevance}
                      disabled={running}
                      aria-label={t('aiRelevanceAria')}
                    />
                  </Field>
                  <Field data-disabled={!useAiRelevance || undefined}>
                    <FieldLabel htmlFor={relevanceInstructionsId}>{t('instructionsLabel')}</FieldLabel>
                    <Textarea
                      id={relevanceInstructionsId}
                      value={relevanceInstructions}
                      onChange={(e) => setRelevanceInstructions(e.target.value)}
                      placeholder={t('instructionsPlaceholder')}
                      disabled={running || !useAiRelevance}
                      maxLength={2000}
                      rows={3}
                      className="min-h-20 resize-y"
                    />
                    <FieldDescription>{t('instructionsHint')}</FieldDescription>
                  </Field>
                </FieldGroup>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void handleRun()} disabled={running}>
                    {running ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Play data-icon="inline-start" />
                    )}
                    {running ? t('running') : t('run')}
                  </Button>
                </div>
              </CardHeader>

              <CardHeader className="border-b pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{t('candidatesTitle')}</CardTitle>
                      {hasRun ? (
                        <Badge variant="outline" className="font-normal">
                          {t('candidatesCount', { count: candidates.length })}
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription>{t('candidatesCardDescription')}</CardDescription>
                  </div>
                  {candidates.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={running || selectedCount === candidates.length}
                        onClick={selectAllCandidates}
                      >
                        {t('selectAll')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={running || selectedCount === 0}
                        onClick={clearSelection}
                      >
                        {t('clearSelection')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {fetchError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t('fetchErrorTitle')}</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                  </Alert>
                ) : null}

                {!hasRun ? (
                  <Empty className="border border-dashed border-border/70 py-10 md:py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarDays />
                      </EmptyMedia>
                      <EmptyTitle>{t('candidatesEmptyTitle')}</EmptyTitle>
                      <EmptyDescription>{t('candidatesEmptyDescription')}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" onClick={() => void handleRun()} disabled={running}>
                        {running ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <Play data-icon="inline-start" />
                        )}
                        {running ? t('running') : t('run')}
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : candidates.length === 0 ? (
                  <Empty className="border border-dashed border-border/70 py-10 md:py-12">
                    <EmptyHeader>
                      <EmptyTitle>
                        {lastFetchEmpty ? t('candidatesNoneTitle') : t('candidatesClearedTitle')}
                      </EmptyTitle>
                      <EmptyDescription>
                        {lastFetchEmpty
                          ? t('candidatesNoneDescription')
                          : t('candidatesClearedDescription')}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {candidates.map((item) => {
                      const checked = selectedIds.has(item.id)
                      const selectId = `ph-candidate-${item.id}`
                      return (
                        <li
                          key={item.id}
                          className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <label
                            htmlFor={selectId}
                            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
                          >
                            <Checkbox
                              id={selectId}
                              checked={checked}
                              onCheckedChange={() => toggleSelected(item.id)}
                              aria-label={t('selectItem', { name: item.name })}
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{item.name}</span>
                              <span className="text-muted-foreground block text-xs tabular-nums">
                                {formatHolidayDate(item.date, locale)}
                              </span>
                            </span>
                          </label>
                          <div className="flex shrink-0 gap-2 self-end sm:self-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => keepItems([item.id])}
                            >
                              {t('keep')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => skipItem(item.id)}
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

              {candidates.length > 0 ? (
                <CardFooter className="border-t pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="ml-auto"
                    disabled={selectedCount === 0 || running}
                    onClick={() => keepItems([...selectedIds])}
                  >
                    {t('confirmSelected', { count: selectedCount })}
                  </Button>
                </CardFooter>
              ) : null}
            </Card>

            <Card className="gap-4 py-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{t('confirmedTitle')}</CardTitle>
                  <Badge variant="outline" className="font-normal">
                    {t('confirmedCount', { count: confirmed.length })}
                  </Badge>
                </div>
                <CardDescription>{t('confirmedCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {confirmed.length === 0 ? (
                  <Empty className="border border-dashed border-border/70 py-8 md:py-10">
                    <EmptyHeader>
                      <EmptyTitle>{t('confirmedEmptyTitle')}</EmptyTitle>
                      <EmptyDescription>{t('confirmedEmptyDescription')}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {confirmed.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {formatHolidayDate(item.date, locale)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeConfirmed(item.id)}
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
        </TabsContent>

        <TabsContent value="draftStories">
          <PublicHolidaysDraftStories
            holidays={draftQueue}
            statuses={draftStatuses}
            results={draftResults}
            histories={draftHistories}
            critiqueSummaries={draftCritiqueSummaries}
            confirmedDrafts={confirmedDrafts}
            instructions={draftInstructions}
            onInstructionsChange={setDraftInstructions}
            critique={draftCritique}
            onCritiqueChange={setDraftCritique}
            running={draftRunning}
            progress={draftProgress}
            formatDate={(iso) => formatHolidayDate(iso, locale)}
            onGenerate={() => void handleGenerateDrafts()}
            onConfirm={confirmDraft}
            onSkip={skipDraft}
            onRetry={(id) => void handleRetryDraft(id)}
            onRegenerate={(id, feedback) => void handleRegenerateDraft(id, feedback)}
            onRemoveConfirmed={removeConfirmedDraft}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
