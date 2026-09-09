'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarDays, Play } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

type HolidayItem = {
  id: string
  date: string
  name: string
}

type StepId = 'fetchDates' | 'draftStories' | 'artwork'

const STEPS: { id: StepId; enabled: boolean }[] = [
  { id: 'fetchDates', enabled: true },
  { id: 'draftStories', enabled: false },
  { id: 'artwork', enabled: false },
]

const MOCK_HOLIDAYS: HolidayItem[] = [
  { id: 'mock-1', date: '2026-01-01', name: 'New Year’s Day' },
  { id: 'mock-2', date: '2026-01-06', name: 'Epiphany' },
  { id: 'mock-3', date: '2026-04-03', name: 'Good Friday' },
  { id: 'mock-4', date: '2026-04-06', name: 'Easter Monday' },
  { id: 'mock-5', date: '2026-05-01', name: 'Labour Day' },
  { id: 'mock-6', date: '2026-05-14', name: 'Ascension Day' },
  { id: 'mock-7', date: '2026-05-25', name: 'Whit Monday' },
  { id: 'mock-8', date: '2026-10-03', name: 'German Unity Day' },
  { id: 'mock-9', date: '2026-12-25', name: 'Christmas Day' },
  { id: 'mock-10', date: '2026-12-26', name: 'Boxing Day' },
]

const RUN_DELAY_MS = 400

function sortByDate(items: HolidayItem[]): HolidayItem[] {
  return [...items].toSorted((a, b) => a.date.localeCompare(b.date))
}

export function PublicHolidaysWorkspace() {
  const t = useTranslations('playbooks.items.publicHolidays.workspace')
  const [activeStepId, setActiveStepId] = useState<StepId>('fetchDates')
  const [regionOverride, setRegionOverride] = useState('')
  const [candidates, setCandidates] = useState<HolidayItem[]>([])
  const [confirmed, setConfirmed] = useState<HolidayItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [hasRun, setHasRun] = useState(false)
  const [running, setRunning] = useState(false)

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
    setCandidates((prev) => prev.filter((item) => item.id !== id))
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
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
    setRunning(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, RUN_DELAY_MS))
      const confirmedIds = new Set(confirmed.map((h) => h.id))
      setCandidates(MOCK_HOLIDAYS.filter((h) => !confirmedIds.has(h.id)))
      setSelectedIds(new Set())
      setHasRun(true)
    } finally {
      setRunning(false)
    }
  }

  const selectedCount = selectedIds.size
  const showFetchWorkspace = activeStepId === 'fetchDates'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t('prototypeHint')}</p>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('stepsAria')}>
        {STEPS.map((step) => {
          const isActive = activeStepId === step.id
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!step.enabled}
              onClick={() => {
                if (step.enabled) setActiveStepId(step.id)
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                !step.enabled && 'cursor-not-allowed opacity-50 hover:bg-background',
              )}
            >
              {t(`steps.${step.id}`)}
              {step.id === 'fetchDates' && confirmed.length > 0 ? (
                <Badge
                  variant={isActive ? 'secondary' : 'outline'}
                  className="h-5 min-w-5 justify-center px-1.5 font-normal"
                >
                  {confirmed.length}
                </Badge>
              ) : null}
            </button>
          )
        })}
      </div>

      {showFetchWorkspace ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section
            className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/70 p-4"
            aria-labelledby="ph-candidates-heading"
          >
            <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <Field className="min-w-0 flex-1">
                <FieldLabel htmlFor="ph-region-override">{t('regionOverrideLabel')}</FieldLabel>
                <Input
                  id="ph-region-override"
                  name="regionOverride"
                  autoComplete="off"
                  placeholder={t('regionOverridePlaceholder')}
                  value={regionOverride}
                  onChange={(e) => setRegionOverride(e.target.value)}
                  disabled={running}
                />
              </Field>
              <Button type="button" onClick={() => void handleRun()} disabled={running}>
                {running ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}
                {running ? t('running') : t('run')}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 id="ph-candidates-heading" className="text-sm font-semibold">
                  {t('candidatesTitle')}
                </h2>
                {hasRun ? (
                  <Badge variant="outline" className="font-normal">
                    {t('candidatesCount', { count: candidates.length })}
                  </Badge>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={selectedCount === 0 || running}
                onClick={() => keepItems([...selectedIds])}
              >
                {t('confirmSelected', { count: selectedCount })}
              </Button>
            </div>

            {!hasRun ? (
              <Empty className="border border-dashed border-border/70 py-10 md:py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>{t('candidatesEmptyTitle')}</EmptyTitle>
                  <EmptyDescription>{t('candidatesEmptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : candidates.length === 0 ? (
              <Empty className="border border-dashed border-border/70 py-10 md:py-12">
                <EmptyHeader>
                  <EmptyTitle>{t('candidatesClearedTitle')}</EmptyTitle>
                  <EmptyDescription>{t('candidatesClearedDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                {candidates.map((item) => {
                  const checked = selectedIds.has(item.id)
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSelected(item.id)}
                          aria-label={t('selectItem', { name: item.name })}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">{item.date}</p>
                        </div>
                      </div>
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
          </section>

          <section
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 p-4"
            aria-labelledby="ph-confirmed-heading"
          >
            <div className="flex items-center gap-2">
              <h2 id="ph-confirmed-heading" className="text-sm font-semibold">
                {t('confirmedTitle')}
              </h2>
              <Badge variant="outline" className="font-normal">
                {t('confirmedCount', { count: confirmed.length })}
              </Badge>
            </div>

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
                      <p className="text-muted-foreground text-xs tabular-nums">{item.date}</p>
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
          </section>
        </div>
      ) : (
        <Empty className="border border-dashed border-border/70 py-12">
          <EmptyHeader>
            <EmptyTitle>{t('stepUnavailableTitle')}</EmptyTitle>
            <EmptyDescription>{t('stepUnavailableDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
