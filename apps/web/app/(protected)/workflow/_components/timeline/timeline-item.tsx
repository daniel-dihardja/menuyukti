'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

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
import { MilestoneItemMobileRunModel } from './milestone-item-mobile-run-model'
import { TimelineItemHeaderProvider } from './timeline-item-header-context'
import { MilestoneItemTabs, type MilestoneInputModel } from './milestone-item-tabs'
import { MilestoneRunProgressStrip } from './milestone-run-progress'
import { isKeyboardEventFromNestedInteractive, TimelineRailMarker } from './timeline-rail'
import type { PassCriteriaRow, TimelineMilestone, TimelineMilestoneStatus } from './types'

import type { FieldSaveStatusVariant } from '@/components/field-save-status'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  normalizePromotionCandidatesInput,
  optionalNotesFromMilestoneInput,
  promotionCandidatesInputFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { extractCampaignBriefMainCategory } from '@/lib/milestones/campaign-brief-main-category'
import { milestonePresetInputType } from '@/lib/milestones/preset-definitions'
import { useTimelineWorkspaceState } from '../timeline-context'
import type { PromotionCandidatesInputDraft } from './milestone-promotion-candidates-input'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

/** Input autosave debounce; optional notes updates avoid draft rewrites to preserve caret. */
const MILESTONE_INPUT_AUTOSAVE_DEBOUNCE_MS = 1200

function datesInputFromMilestone(raw: TimelineMilestone['milestoneInput']): {
  startDate: string
  endDate: string
} {
  if (raw?.type === 'dates' && raw.value != null && typeof raw.value === 'object') {
    const value = raw.value as Partial<{ startDate: string; endDate: string }>
    return {
      startDate: typeof value.startDate === 'string' ? value.startDate : '',
      endDate: typeof value.endDate === 'string' ? value.endDate : '',
    }
  }
  return { startDate: '', endDate: '' }
}

function promotionCandidatesInputEqual(
  a: PromotionCandidatesInputDraft,
  b: PromotionCandidatesInputDraft,
): boolean {
  const na = normalizePromotionCandidatesInput(a)
  const nb = normalizePromotionCandidatesInput(b)
  if (na.notes !== nb.notes) return false
  if (na.starItemLimit !== nb.starItemLimit) return false
  if (na.puzzleItemLimit !== nb.puzzleItemLimit) return false
  if (na.selectedMenuCategories.length !== nb.selectedMenuCategories.length) return false
  return na.selectedMenuCategories.every((v, i) => v === nb.selectedMenuCategories[i])
}

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
  savingPassCriteriaMilestoneId,
  savingGoalMilestoneId,
  savingDataMilestoneId,
  runningMilestoneId,
  runningStep,
  isChatBusy,
  isMobile = false,
}: TimelineItemProps) {
  const t = useTranslations('analytics.workflows.chat')
  const { locationId, analyticsRunId, milestoneState } = useTimelineWorkspaceState()
  const campaignBriefMainCategory = useMemo(
    () => extractCampaignBriefMainCategory(milestoneState.milestones),
    [milestoneState.milestones],
  )

  const {
    onDeleteMilestone,
    onUpdatePassCriteria,
    onUpdateMilestoneGoal,
    onUpdateMilestoneInput,
    onMoveMilestone,
    onRunMilestone,
  } = actions

  const [milestoneRunChatModel, setMilestoneRunChatModel] = useState<ChatGatewayModelId>(
    () => DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const [userOpen, setUserOpen] = useState(true)
  const lastMilestoneIdRef = useRef(milestone.id)
  const hadMilestoneDataRef = useRef(milestone.data != null)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(() => milestone.data != null)
  const [goalDraft, setGoalDraft] = useState(() => milestone.goal ?? '')
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
  const inputType = milestonePresetInputType(milestone.presetId)
  const usesOptionalNotesInput = inputType === 'optional_notes'
  const isDatesPreset = inputType === 'dates'
  const isPromotionCandidatesPreset = inputType === 'promotion_candidates'

  const [inputDraft, setInputDraft] = useState<{ startDate: string; endDate: string }>(() =>
    datesInputFromMilestone(milestone.milestoneInput),
  )

  const [promotionCandidatesDraft, setPromotionCandidatesDraft] =
    useState<PromotionCandidatesInputDraft>(() =>
      promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput),
    )

  const [optionalNotesDraft, setOptionalNotesDraft] = useState(() =>
    milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)
      ? optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
      : '',
  )

  useEffect(() => {
    setInputDraft(datesInputFromMilestone(milestone.milestoneInput))
    if (milestone.presetId === 'promotion_candidates') {
      setPromotionCandidatesDraft(
        promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput),
      )
    }
  }, [milestone.id, milestone.milestoneInput, milestone.presetId])

  const previousMilestoneIdRef = useRef(milestone.id)
  const promotionCandidatesFocusedRef = useRef(false)

  useEffect(() => {
    if (milestone.presetId !== 'promotion_candidates') {
      previousMilestoneIdRef.current = milestone.id
      return
    }
    const server = promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput)
    setPromotionCandidatesDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        return server
      }
      if (!promotionCandidatesInputEqual(prev, server)) {
        if (!promotionCandidatesFocusedRef.current) {
          return server
        }
        return prev
      }
      return prev
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

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
        if (!optionalNotesFocusedRef.current) {
          return server
        }
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
  const optionalNotesFocusedRef = useRef(false)

  const promotionCandidatesDraftRef = useRef(promotionCandidatesDraft)
  promotionCandidatesDraftRef.current = promotionCandidatesDraft

  const onUpdateMilestoneInputRef = useRef(onUpdateMilestoneInput)
  onUpdateMilestoneInputRef.current = onUpdateMilestoneInput

  /** Browser timer id (avoid NodeJS.Timeout vs number mismatch under @types/node). */
  const debounceTimerRef = useRef<number | null>(null)
  const flushChainRef = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    setGoalDraft(milestone.goal ?? '')
  }, [milestone.id, milestone.goal])

  const handleAddPassCriterion = async () => {
    if (!onUpdatePassCriteria || savingPassCriteria) {
      return
    }
    const raw = addCriteriaInputRef.current?.value.trim() ?? ''
    if (!raw) {
      return
    }
    const next = [
      ...criteriaRows,
      { id: crypto.randomUUID(), requirement: raw, status: 'open' as const },
    ]
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

  const promotionCandidatesDirty = useMemo(() => {
    if (!isPromotionCandidatesPreset) {
      return false
    }
    const server = promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput)
    return !promotionCandidatesInputEqual(promotionCandidatesDraft, server)
  }, [isPromotionCandidatesPreset, milestone.milestoneInput, promotionCandidatesDraft])

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
        const ok = await onUpdate(m.id, {
          type: 'dates',
          value: {
            startDate: draft.startDate,
            endDate: draft.endDate,
          },
        })
        if (!ok) {
          setInputDraft(server)
        }
        return ok
      }
      if (m.presetId === 'promotion_candidates') {
        const server = promotionCandidatesInputFromMilestoneInput(m.milestoneInput)
        const normalizedDraft = normalizePromotionCandidatesInput(
          promotionCandidatesDraftRef.current,
        )
        if (promotionCandidatesInputEqual(normalizedDraft, server)) {
          if (
            normalizeOptionalNotesDraft &&
            !promotionCandidatesInputEqual(promotionCandidatesDraftRef.current, normalizedDraft)
          ) {
            setPromotionCandidatesDraft(normalizedDraft)
          }
          return true
        }
        const ok = await onUpdate(m.id, {
          type: 'promotion_candidates',
          value: normalizedDraft,
        })
        if (!ok) {
          setPromotionCandidatesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setPromotionCandidatesDraft(normalizedDraft)
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
    [setInputDraft, setOptionalNotesDraft, setPromotionCandidatesDraft],
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
    const dirty =
      (isDatesPreset && inputDirty) ||
      (isPromotionCandidatesPreset && promotionCandidatesDirty) ||
      (!isDatesPreset &&
        !isPromotionCandidatesPreset &&
        usesOptionalNotesInput &&
        optionalNotesDirty)
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
    promotionCandidatesDirty,
    promotionCandidatesDraft,
    flushMilestoneInputSave,
    inputDirty,
    inputDraft,
    isPromotionCandidatesPreset,
    usesOptionalNotesInput,
    isDatesPreset,
    isMilestoneRunning,
    onUpdateMilestoneInput,
  ])

  const handleRunMilestoneWithInputFlush = useCallback(
    async (id: string, chatModel?: ChatGatewayModelId) => {
      if (id === milestone.id) {
        const ok = await flushMilestoneInputSave()
        if (!ok) {
          return
        }
      }
      await onRunMilestone(id, chatModel)
    },
    [flushMilestoneInputSave, milestone.id, onRunMilestone],
  )

  const inputSaveStatus: FieldSaveStatusVariant = savingInput
    ? 'saving'
    : (isDatesPreset && inputDirty) ||
        (isPromotionCandidatesPreset && promotionCandidatesDirty) ||
        (usesOptionalNotesInput && optionalNotesDirty)
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
    optionalNotesFocusedRef.current = false
    void flushMilestoneInputSave({ normalizeOptionalNotesDraft: true })
  }

  const handleOptionalNotesFocus = () => {
    optionalNotesFocusedRef.current = true
  }

  const handlePromotionCandidatesNotesBlur = () => {
    promotionCandidatesFocusedRef.current = false
    void flushMilestoneInputSave({ normalizeOptionalNotesDraft: true })
  }

  const handlePromotionCandidatesNotesFocus = () => {
    promotionCandidatesFocusedRef.current = true
  }

  const handlePromotionCandidatesDraftChange = (next: PromotionCandidatesInputDraft) => {
    promotionCandidatesFocusedRef.current = true
    setPromotionCandidatesDraft(next)
  }

  const inputModel = useMemo((): MilestoneInputModel => {
    if (isDatesPreset) {
      return {
        type: 'dates',
        draft: inputDraft,
        setDraft: setInputDraft,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isPromotionCandidatesPreset) {
      return {
        type: 'promotion_candidates',
        draft: promotionCandidatesDraft,
        onChange: handlePromotionCandidatesDraftChange,
        onNotesBlur: handlePromotionCandidatesNotesBlur,
        onNotesFocus: handlePromotionCandidatesNotesFocus,
        locationId,
        analyticsRunId,
        mainCategory: campaignBriefMainCategory,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (usesOptionalNotesInput && milestone.presetId) {
      const presetId = milestone.presetId
      const base = `milestonePreset.${presetId}` as const
      return {
        type: 'optional_notes',
        draft: optionalNotesDraft,
        setDraft: setOptionalNotesDraft,
        onBlur: handleOptionalNotesBlur,
        onFocus: handleOptionalNotesFocus,
        copy: {
          label: t(`${base}.inputLabel`),
          description: t(`${base}.inputDescription`),
          placeholder: t(`${base}.inputPlaceholder`),
        },
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    return { type: 'none' }
  }, [
    analyticsRunId,
    campaignBriefMainCategory,
    handleOptionalNotesBlur,
    handleOptionalNotesFocus,
    handlePromotionCandidatesDraftChange,
    handlePromotionCandidatesNotesBlur,
    handlePromotionCandidatesNotesFocus,
    inputDraft,
    inputSaveStatus,
    isDatesPreset,
    isPromotionCandidatesPreset,
    locationId,
    milestone.presetId,
    optionalNotesDraft,
    promotionCandidatesDraft,
    savingInput,
    t,
    usesOptionalNotesInput,
  ])

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
      className={cn(
        'flex min-w-0 w-full cursor-pointer rounded-md outline-none [contain-intrinsic-size:0_200px] [content-visibility:auto] focus-visible:ring-2 focus-visible:ring-ring/60',
        isMobile ? 'gap-2' : 'gap-4',
      )}
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
      {!isMobile ? (
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
      ) : null}
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-8')}>
        <Collapsible className="min-w-0 w-full" onOpenChange={setUserOpen} open={open}>
          <Card
            className={cn(
              'min-w-0 w-full gap-0 border py-4 shadow-none transition-[background-color,box-shadow,border-color]',
              isSelected ? 'border-primary bg-accent/50 ring-2 ring-ring/50' : 'hover:bg-accent/30',
            )}
          >
            <TimelineItemHeaderProvider
              value={{
                milestone,
                isMobile,
                position,
                runState,
                deleteState,
                movement: {
                  moving: isMoving,
                  move: onMoveMilestone,
                },
                milestoneRunChatModel,
                onMilestoneRunChatModelChange: setMilestoneRunChatModel,
                actions: {
                  run: isChatBusy ? undefined : handleRunMilestoneWithInputFlush,
                  deleteMilestone: onDeleteMilestone,
                },
              }}
            >
              <MilestoneItemHeader open={open} />
              {isMilestoneRunning ? <MilestoneRunProgressStrip runningStep={runningStep} /> : null}
              <CollapsibleContent
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MilestoneItemMobileRunModel />
                <MilestoneItemTabs
                  model={{
                    addCriteriaInputId,
                    addCriteriaInputRef,
                    criteriaRows,
                    goalDraft,
                    goalFieldId,
                    handleAddPassCriterion,
                    handleGoalSave,
                    handleRemovePassCriterion,
                    hasResult,
                    inputModel,
                    isMilestoneRunning,
                    milestone,
                    savingGoal,
                    savingPassCriteria,
                    setGoalDraft,
                  }}
                />
              </CollapsibleContent>
            </TimelineItemHeaderProvider>
          </Card>
        </Collapsible>
        {isMobile ? (
          <div
            className="min-w-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Collapsible
              className="mt-2 min-w-0 overflow-hidden rounded-lg border bg-muted/20 shadow-sm"
              onOpenChange={setMobilePreviewOpen}
              open={mobilePreviewOpen}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'flex w-full min-h-10 items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground',
                    'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  )}
                  type="button"
                >
                  <span className="min-w-0 truncate">{t('milestonePreviewToggle')}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      mobilePreviewOpen && 'rotate-180',
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-border border-t px-3 py-3">
                  <MilestoneDataPreview milestone={milestone} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const TimelineItem = memo(TimelineItemInner)
