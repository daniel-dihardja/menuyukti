'use client'

import { memo, useEffect, useRef, useState } from 'react'

import { Card } from '@workspace/ui/components/card'
import { Collapsible, CollapsibleContent } from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

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

function brandBriefNotesFromMilestone(raw: TimelineMilestone['milestoneInput']): string {
  if (
    raw?.type === 'restaurant_brand_brief' &&
    raw.value != null &&
    typeof raw.value === 'object'
  ) {
    const n = (raw.value as { notes?: unknown }).notes
    return typeof n === 'string' ? n : ''
  }
  return ''
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
  renamingMilestoneId: TimelineMilestoneState['renamingMilestoneId']
  savingPassCriteriaMilestoneId: TimelineMilestoneState['savingPassCriteriaMilestoneId']
  savingGoalMilestoneId: TimelineMilestoneState['savingGoalMilestoneId']
  savingDataMilestoneId: TimelineMilestoneState['savingDataMilestoneId']
  runningMilestoneId: TimelineMilestoneState['runningMilestoneId']
  runningStep: TimelineMilestoneState['runningStep']
  isChatBusy: boolean
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
}: TimelineItemProps) {
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

  const savingPassCriteria = savingPassCriteriaMilestoneId === milestone.id
  const savingGoal = savingGoalMilestoneId === milestone.id
  const savingInput = savingDataMilestoneId === milestone.id
  const isDatesPreset = milestone.presetId === 'dates'
  const isBrandBriefPreset = milestone.presetId === 'restaurant_brand_brief'

  const [inputDraft, setInputDraft] = useState<DatesMilestoneInput>(() =>
    datesInputFromMilestone(milestone.milestoneInput),
  )

  const [brandBriefNotesDraft, setBrandBriefNotesDraft] = useState(() =>
    brandBriefNotesFromMilestone(milestone.milestoneInput),
  )

  useEffect(() => {
    setInputDraft(datesInputFromMilestone(milestone.milestoneInput))
  }, [milestone.milestoneInput])

  useEffect(() => {
    setBrandBriefNotesDraft(brandBriefNotesFromMilestone(milestone.milestoneInput))
  }, [milestone.id, milestone.milestoneInput])
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

  const handleInputSave = async () => {
    if (!isDatesPreset || savingInput || !onUpdateMilestoneInput) {
      return
    }
    if (!inputDirty) {
      return
    }
    const ok = await onUpdateMilestoneInput(milestone.id, {
      type: 'dates',
      value: inputDraft,
    })
    if (!ok) {
      setInputDraft(serverDatesInput)
    }
  }

  const handleBrandBriefNotesBlur = () => {
    if (!isBrandBriefPreset || savingInput || !onUpdateMilestoneInput) {
      return
    }
    const server = brandBriefNotesFromMilestone(milestone.milestoneInput)
    const trimmedDraft = brandBriefNotesDraft.trim()
    const trimmedServer = server.trim()
    if (trimmedDraft === trimmedServer) {
      if (brandBriefNotesDraft !== trimmedDraft) {
        setBrandBriefNotesDraft(trimmedDraft)
      }
      return
    }
    void (async () => {
      const ok = await onUpdateMilestoneInput(milestone.id, {
        type: 'restaurant_brand_brief',
        value: { notes: trimmedDraft },
      })
      if (!ok) {
        setBrandBriefNotesDraft(server)
      } else {
        setBrandBriefNotesDraft(trimmedDraft)
      }
    })()
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
                  run: isChatBusy ? undefined : onRunMilestone,
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
                  brandBriefNotesDraft,
                  criteriaRows,
                  goalDraft,
                  goalFieldId,
                  handleAddPassCriterion,
                  handleBrandBriefNotesBlur,
                  handleGoalSave,
                  handleInputSave,
                  handleRemovePassCriterion,
                  hasResult,
                  inputDirty,
                  inputDraft,
                  isBrandBriefPreset,
                  isMilestoneRunning,
                  isDatesPreset,
                  milestone,
                  savingGoal,
                  savingInput,
                  savingPassCriteria,
                  setBrandBriefNotesDraft,
                  setGoalDraft,
                  setInputDraft,
                }}
              />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  )
}

export const TimelineItem = memo(TimelineItemInner)
