'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

import { MilestoneDataPreview } from '../milestone-preview/milestone-data-preview'
import type { TimelineActions, TimelineMilestoneState } from '../timeline-context'
import { MilestoneItemHeader } from './milestone-item-header'
import { TimelineItemHeaderProvider } from './timeline-item-header-context'
import { MilestoneItemTabs } from './milestone-item-tabs'
import { MilestoneRunProgressStrip } from './milestone-run-progress'
import { isKeyboardEventFromNestedInteractive, TimelineRailMarker } from './timeline-rail'
import type {
  DatesMilestoneInput,
  PassCriteriaRow,
  TimelineMilestone,
  TimelineMilestoneStatus,
} from './types'

import type { FieldSaveStatusVariant } from '@/components/field-save-status'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  optionalNotesFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'

/** Input autosave debounce; optional notes updates avoid draft rewrites to preserve caret. */
const MILESTONE_INPUT_AUTOSAVE_DEBOUNCE_MS = 1200

export type TimelineItemProps = {
  milestone: TimelineMilestone
  positionIndex: number
  isFirst: boolean
  isLast: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  showDelete: boolean
  actions: TimelineActions
  deletingMilestoneId: TimelineMilestoneState['deletingMilestoneId']
  movingMilestoneId: TimelineMilestoneState['movingMilestoneId']
  renamingMilestoneId: TimelineMilestoneState['renamingMilestoneId']
  savingPassCriteriaMilestoneId: TimelineMilestoneState['savingPassCriteriaMilestoneId']
  savingGoalMilestoneId: TimelineMilestoneState['savingGoalMilestoneId']
  savingDataMilestoneId: TimelineMilestoneState['savingDataMilestoneId']
  runningMilestoneId: TimelineMilestoneState['runningMilestoneId']
  runningStep: TimelineMilestoneState['runningStep']
  isChatBusy: boolean
  /** Inline data preview below the card (narrow viewports only). */
  isMobile?: boolean
}

function TimelineItemInner({
  milestone,
  positionIndex,
  isFirst,
  isLast,
  isSelected,
  onSelect,
  showDelete,
  actions,
  deletingMilestoneId,
  movingMilestoneId,
  renamingMilestoneId,
  savingPassCriteriaMilestoneId,
  savingGoalMilestoneId,
  savingDataMilestoneId,
  runningMilestoneId,
  runningStep,
  isChatBusy,
  isMobile = false,
}: TimelineItemProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const datesInputFromMilestone = (
    raw: TimelineMilestone['milestoneInput'],
  ): DatesMilestoneInput => {
    if (raw?.type === 'dates' && raw.value != null && typeof raw.value === 'object') {
      const value = raw.value as Partial<DatesMilestoneInput>
      return {
        startDate: typeof value.startDate === 'string' ? value.startDate : '',
        endDate: typeof value.endDate === 'string' ? value.endDate : '',
      }
    }
    return { startDate: '', endDate: '' }
  }

  const {
    onDeleteMilestone,
    onRenameMilestone,
    onUpdatePassCriteria,
    onUpdateMilestoneGoal,
    onUpdateMilestoneInput,
    onMoveMilestone,
    onRunMilestone,
  } = actions

  const [userOpen, setUserOpen] = useState(true)
  const lastMilestoneIdRef = useRef(milestone.id)
  const hadMilestoneDataRef = useRef(milestone.data != null)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(() => milestone.data != null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(milestone.title)
  const [goalDraft, setGoalDraft] = useState(() => milestone.goal ?? '')
  const titleEditInputId = `milestone-title-edit-${milestone.id}`
  const titleEditInputRef = useRef<HTMLInputElement>(null)
  const titleEditContainerRef = useRef<HTMLDivElement>(null)
  const addCriteriaInputRef = useRef<HTMLInputElement>(null)
  const isMilestoneRunning = runningMilestoneId === milestone.id
  /** Keep the card expanded for the whole run; user can collapse again after the run ends. */
  const open = isMilestoneRunning || userOpen
  const status: TimelineMilestoneStatus = milestone.status ?? 'empty'
  const [criteriaRows, setCriteriaRows] = useState<PassCriteriaRow[]>(() => milestone.passCriteria)
  const addCriteriaInputId = `milestone-pass-criteria-add-${milestone.id}`

  useEffect(() => {
    setCriteriaRows(milestone.passCriteria)
  }, [milestone.id, milestone.passCriteria])

  useEffect(() => {
    if (!isMobile) {
      return
    }
    const idChanged = lastMilestoneIdRef.current !== milestone.id
    if (idChanged) {
      lastMilestoneIdRef.current = milestone.id
      hadMilestoneDataRef.current = milestone.data != null
      setMobilePreviewOpen(milestone.data != null)
      return
    }
    const nowHasData = milestone.data != null
    if (!hadMilestoneDataRef.current && nowHasData) {
      setMobilePreviewOpen(true)
    }
    hadMilestoneDataRef.current = nowHasData
  }, [isMobile, milestone.id, milestone.data])

  const savingPassCriteria = savingPassCriteriaMilestoneId === milestone.id
  const savingGoal = savingGoalMilestoneId === milestone.id
  const savingInput = savingDataMilestoneId === milestone.id
  const isDatesPreset = milestone.presetId === 'dates'
  const usesOptionalNotesInput = milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)

  const [inputDraft, setInputDraft] = useState<DatesMilestoneInput>(() =>
    datesInputFromMilestone(milestone.milestoneInput),
  )

  const [optionalNotesDraft, setOptionalNotesDraft] = useState(() =>
    milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)
      ? optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
      : '',
  )

  useEffect(() => {
    setInputDraft(datesInputFromMilestone(milestone.milestoneInput))
  }, [milestone.id, milestone.milestoneInput])

  const previousMilestoneIdRef = useRef(milestone.id)

  useEffect(() => {
    if (!milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)) {
      previousMilestoneIdRef.current = milestone.id
      return
    }
    const server = optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
    setOptionalNotesDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        return server
      }
      if (prev.trim() !== server.trim()) {
        return prev
      }
      return prev === server ? prev : server
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  const milestoneRef = useRef(milestone)
  milestoneRef.current = milestone

  const inputDraftRef = useRef(inputDraft)
  inputDraftRef.current = inputDraft

  const optionalNotesDraftRef = useRef(optionalNotesDraft)
  optionalNotesDraftRef.current = optionalNotesDraft

  const onUpdateMilestoneInputRef = useRef(onUpdateMilestoneInput)
  onUpdateMilestoneInputRef.current = onUpdateMilestoneInput

  /** Browser timer id (avoid NodeJS.Timeout vs number mismatch under @types/node). */
  const debounceTimerRef = useRef<number | null>(null)
  const flushChainRef = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    setGoalDraft(milestone.goal ?? '')
  }, [milestone.id, milestone.goal])

  useEffect(() => {
    if (!editingTitle) {
      setDraftTitle(milestone.title)
    }
  }, [milestone.id, milestone.title, editingTitle])

  useEffect(() => {
    if (!editingTitle) {
      return
    }
    titleEditInputRef.current?.focus()
    titleEditInputRef.current?.select()
  }, [editingTitle])

  useEffect(() => {
    if (!editingTitle) {
      return
    }
    const onPointerDownCapture = (e: PointerEvent) => {
      if (renamingMilestoneId === milestone.id) {
        return
      }
      const target = e.target
      if (!(target instanceof Node)) {
        return
      }
      if (titleEditContainerRef.current?.contains(target)) {
        return
      }
      setEditingTitle(false)
      setDraftTitle(milestone.title)
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [editingTitle, milestone.id, milestone.title, renamingMilestoneId])

  const renaming = renamingMilestoneId === milestone.id

  const handleSaveTitle = async () => {
    const trimmed = draftTitle.trim()
    if (!trimmed || !onRenameMilestone) {
      return
    }
    const ok = await onRenameMilestone(milestone.id, trimmed)
    if (ok) {
      setEditingTitle(false)
    }
  }

  const handleAddPassCriterion = async () => {
    if (!onUpdatePassCriteria || savingPassCriteria) {
      return
    }
    const raw = addCriteriaInputRef.current?.value.trim() ?? ''
    if (!raw) {
      return
    }
    const next = [...criteriaRows, { requirement: raw, status: 'open' as const }]
    const ok = await onUpdatePassCriteria(milestone.id, next)
    if (ok && addCriteriaInputRef.current) {
      addCriteriaInputRef.current.value = ''
    }
  }

  const handleRemovePassCriterion = async (index: number) => {
    if (!onUpdatePassCriteria || savingPassCriteria) {
      return
    }
    const next = criteriaRows.filter((_, i) => i !== index)
    await onUpdatePassCriteria(milestone.id, next)
  }

  const goalFieldId = `milestone-goal-${milestone.id}`
  const hasResult = Boolean(milestone.resultMarkdown?.trim())
  const serverDatesInput = datesInputFromMilestone(milestone.milestoneInput)
  const inputDirty =
    inputDraft.startDate !== serverDatesInput.startDate ||
    inputDraft.endDate !== serverDatesInput.endDate

  const optionalNotesDirty = useMemo(() => {
    if (!milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)) {
      return false
    }
    const server = optionalNotesFromMilestoneInput(
      milestone.milestoneInput,
      milestone.presetId,
    ).trim()
    return optionalNotesDraft.trim() !== server
  }, [milestone.milestoneInput, milestone.presetId, optionalNotesDraft])

  const performMilestoneInputFlush = useCallback(
    async ({
      normalizeOptionalNotesDraft,
    }: {
      normalizeOptionalNotesDraft: boolean
    }): Promise<boolean> => {
      const onUpdate = onUpdateMilestoneInputRef.current
      if (!onUpdate) {
        return true
      }
      const m = milestoneRef.current
      if (m.presetId === 'dates') {
        const server = datesInputFromMilestone(m.milestoneInput)
        const draft = inputDraftRef.current
        if (draft.startDate === server.startDate && draft.endDate === server.endDate) {
          return true
        }
        const ok = await onUpdate(m.id, { type: 'dates', value: draft })
        if (!ok) {
          setInputDraft(server)
        }
        return ok
      }
      if (milestonePresetHasDefaultOptionalNotesInput(m.presetId)) {
        const server = optionalNotesFromMilestoneInput(m.milestoneInput, m.presetId)
        const trimmedDraft = optionalNotesDraftRef.current.trim()
        const trimmedServer = server.trim()
        if (trimmedDraft === trimmedServer) {
          if (normalizeOptionalNotesDraft && optionalNotesDraftRef.current !== trimmedDraft) {
            setOptionalNotesDraft(trimmedDraft)
          }
          return true
        }
        const ok = await onUpdate(m.id, {
          type: m.presetId,
          value: { notes: trimmedDraft },
        })
        if (!ok) {
          setOptionalNotesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setOptionalNotesDraft(trimmedDraft)
        }
        return ok
      }
      return true
    },
    [setInputDraft, setOptionalNotesDraft],
  )

  const flushMilestoneInputSave = useCallback(
    async (options?: { normalizeOptionalNotesDraft?: boolean }): Promise<boolean> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const normalizeOptionalNotesDraft = options?.normalizeOptionalNotesDraft ?? false
      const run = flushChainRef.current.then(() =>
        performMilestoneInputFlush({ normalizeOptionalNotesDraft }),
      )
      flushChainRef.current = run.catch(() => false)
      return run
    },
    [performMilestoneInputFlush],
  )

  useEffect(() => {
    if (!onUpdateMilestoneInput) {
      return
    }
    if (isMilestoneRunning) {
      return
    }
    const dirty = (isDatesPreset && inputDirty) || (usesOptionalNotesInput && optionalNotesDirty)
    if (!dirty) {
      return
    }
    const id = window.setTimeout(() => {
      debounceTimerRef.current = null
      void flushMilestoneInputSave()
    }, MILESTONE_INPUT_AUTOSAVE_DEBOUNCE_MS)
    debounceTimerRef.current = id
    return () => {
      window.clearTimeout(id)
      if (debounceTimerRef.current === id) {
        debounceTimerRef.current = null
      }
    }
  }, [
    optionalNotesDirty,
    optionalNotesDraft,
    flushMilestoneInputSave,
    inputDirty,
    inputDraft,
    usesOptionalNotesInput,
    isDatesPreset,
    isMilestoneRunning,
    onUpdateMilestoneInput,
  ])

  const handleRunMilestoneWithInputFlush = useCallback(
    async (id: string) => {
      if (id === milestone.id) {
        const ok = await flushMilestoneInputSave()
        if (!ok) {
          return
        }
      }
      await onRunMilestone(id)
    },
    [flushMilestoneInputSave, milestone.id, onRunMilestone],
  )

  const inputSaveStatus: FieldSaveStatusVariant = savingInput
    ? 'saving'
    : (isDatesPreset && inputDirty) || (usesOptionalNotesInput && optionalNotesDirty)
      ? 'unsaved'
      : 'saved'

  const handleGoalSave = () => {
    if (!onUpdateMilestoneGoal || savingGoal) {
      return
    }
    const server = milestone.goal ?? ''
    if (goalDraft === server) {
      return
    }
    void (async () => {
      const ok = await onUpdateMilestoneGoal(milestone.id, goalDraft)
      if (!ok) {
        setGoalDraft(server)
      }
    })()
  }

  const handleOptionalNotesBlur = () => {
    void flushMilestoneInputSave({ normalizeOptionalNotesDraft: true })
  }

  const isDeleting = deletingMilestoneId === milestone.id
  const isMoving = movingMilestoneId === milestone.id
  const position = isFirst ? 'first' : isLast ? 'last' : 'middle'
  const runState = isMilestoneRunning
    ? ('running' as const)
    : runningMilestoneId !== null
      ? ('blocked' as const)
      : ('idle' as const)
  const deleteState = !showDelete
    ? ('hidden' as const)
    : isDeleting
      ? ('deleting' as const)
      : ('idle' as const)

  return (
    <div
      aria-selected={isSelected}
      className="flex cursor-pointer gap-4 rounded-md outline-none [contain-intrinsic-size:0_200px] [content-visibility:auto] focus-visible:ring-2 focus-visible:ring-ring/60"
      data-timeline-card=""
      onClick={() => {
        onSelect(milestone.id)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') {
          return
        }
        if (isKeyboardEventFromNestedInteractive(e.target)) {
          return
        }
        e.preventDefault()
        onSelect(milestone.id)
      }}
      role="option"
      tabIndex={0}
    >
      <div className="flex w-12 shrink-0 flex-col items-center">
        {isFirst ? (
          <div className="flex w-full shrink-0 flex-col items-center pt-4">
            <div className="mt-0.5 flex min-h-9 w-full items-center justify-center">
              <TimelineRailMarker status={status} />
            </div>
            <span className="mt-0.5 text-center text-muted-foreground text-xs tabular-nums">
              {positionIndex}
            </span>
          </div>
        ) : (
          <div className="flex w-full shrink-0 flex-col items-center">
            <div
              aria-hidden
              className="h-4 w-px shrink-0 border-l border-dashed border-border dark:border-muted-foreground/45"
            />
            <div className="mt-0.5 flex min-h-9 w-full items-center justify-center">
              <TimelineRailMarker status={status} />
            </div>
            <span className="mt-0.5 text-center text-muted-foreground text-xs tabular-nums">
              {positionIndex}
            </span>
          </div>
        )}
        {isLast ? null : (
          <div
            aria-hidden
            className="min-h-0 w-px flex-1 border-l border-dashed border-border dark:border-muted-foreground/45"
          />
        )}
      </div>
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-8')}>
        <Collapsible onOpenChange={setUserOpen} open={open}>
          <Card
            className={cn(
              'gap-0 border py-4 shadow-none transition-[background-color,box-shadow,border-color]',
              isSelected ? 'border-primary bg-accent/50 ring-2 ring-ring/50' : 'hover:bg-accent/30',
            )}
          >
            <TimelineItemHeaderProvider
              value={{
                milestone,
                position,
                runState,
                deleteState,
                titleEditor: {
                  editing: editingTitle,
                  draft: draftTitle,
                  setEditing: setEditingTitle,
                  setDraft: setDraftTitle,
                  inputId: titleEditInputId,
                  inputRef: titleEditInputRef,
                  containerRef: titleEditContainerRef,
                  renaming,
                  save: handleSaveTitle,
                  canRename: Boolean(onRenameMilestone),
                },
                movement: {
                  moving: isMoving,
                  move: onMoveMilestone,
                },
                actions: {
                  run: isChatBusy ? undefined : handleRunMilestoneWithInputFlush,
                  deleteMilestone: onDeleteMilestone,
                },
              }}
            >
              <MilestoneItemHeader open={open} />
            </TimelineItemHeaderProvider>
            {isMilestoneRunning ? <MilestoneRunProgressStrip runningStep={runningStep} /> : null}
            <CollapsibleContent
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MilestoneItemTabs
                model={{
                  addCriteriaInputId,
                  addCriteriaInputRef,
                  criteriaRows,
                  goalDraft,
                  goalFieldId,
                  handleAddPassCriterion,
                  handleGoalSave,
                  handleOptionalNotesBlur,
                  handleRemovePassCriterion,
                  hasResult,
                  inputDraft,
                  inputSaveStatus,
                  isDatesPreset,
                  isMilestoneRunning,
                  milestone,
                  optionalNotesDraft,
                  savingGoal,
                  savingInput,
                  savingPassCriteria,
                  setGoalDraft,
                  setInputDraft,
                  setOptionalNotesDraft,
                }}
              />
            </CollapsibleContent>
          </Card>
        </Collapsible>
        {isMobile ? (
          <div
            className="mt-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Collapsible onOpenChange={setMobilePreviewOpen} open={mobilePreviewOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  className="w-full justify-between gap-2 font-normal"
                  type="button"
                  variant="outline"
                >
                  <span>{t('milestonePreviewToggle')}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      mobilePreviewOpen && 'rotate-180',
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-md border bg-muted/20 p-3">
                <MilestoneDataPreview milestone={milestone} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const TimelineItem = memo(TimelineItemInner)
