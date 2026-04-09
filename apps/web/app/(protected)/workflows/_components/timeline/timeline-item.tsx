'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Card } from '@workspace/ui/components/card'
import { Collapsible, CollapsibleContent } from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

import { useTimelineContext } from '../timeline-context'
import { MilestoneItemHeader } from './milestone-item-header'
import { MilestoneItemTabs } from './milestone-item-tabs'
import { MilestoneRunProgressStrip } from './milestone-run-progress'
import { isKeyboardEventFromNestedInteractive, TimelineRailMarker } from './timeline-rail'
import type {
  MilestoneStatusLabels,
  PassCriteriaRow,
  TimelineMilestone,
  TimelineMilestoneStatus,
} from './types'

export type TimelineItemProps = {
  milestone: TimelineMilestone
  positionIndex: number
  isFirst: boolean
  isLast: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
  showDelete: boolean
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  deleteMilestoneConfirmTitle: string
  deleteMilestoneConfirmDescription: string
  deleteMilestoneConfirmCancel: string
  deleteMilestoneConfirmAction: string
}

function TimelineItemInner({
  milestone,
  positionIndex,
  isFirst,
  isLast,
  isSelected,
  onSelect,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
  showDelete,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  deleteMilestoneConfirmTitle,
  deleteMilestoneConfirmDescription,
  deleteMilestoneConfirmCancel,
  deleteMilestoneConfirmAction,
}: TimelineItemProps) {
  const {
    onDeleteMilestone,
    deletingMilestoneId,
    movingMilestoneId,
    renamingMilestoneId,
    savingPassCriteriaMilestoneId,
    savingGoalMilestoneId,
    preparingMilestoneId,
    onRenameMilestone,
    onUpdatePassCriteria,
    onUpdateMilestoneGoal,
    onSetMilestoneDataTask,
    onPrepareMilestone,
    onMoveMilestone,
    onRunMilestone,
    isChatBusy,
    runningMilestoneId,
    runningStep,
  } = useTimelineContext()

  const [userOpen, setUserOpen] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(milestone.title)
  const [goalDraft, setGoalDraft] = useState(() => milestone.goal ?? '')
  const titleEditInputId = `milestone-title-edit-${milestone.id}`
  const titleEditInputRef = useRef<HTMLInputElement>(null)
  const titleEditContainerRef = useRef<HTMLDivElement>(null)
  const addCriteriaInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('analytics.campaigns.chat')
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

  const isDeleting = deletingMilestoneId === milestone.id
  const isMoving = movingMilestoneId === milestone.id

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
              <TimelineRailMarker labels={statusLabels} status={status} />
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
              <TimelineRailMarker labels={statusLabels} status={status} />
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
            <MilestoneItemHeader
              collapseDetailsLabel={collapseDetailsLabel}
              deleteButtonLabel={deleteButtonLabel}
              deleteMilestoneAriaLabel={deleteMilestoneAriaLabel}
              deleteMilestoneConfirmAction={deleteMilestoneConfirmAction}
              deleteMilestoneConfirmCancel={deleteMilestoneConfirmCancel}
              deleteMilestoneConfirmDescription={deleteMilestoneConfirmDescription}
              deleteMilestoneConfirmTitle={deleteMilestoneConfirmTitle}
              draftTitle={draftTitle}
              editMilestoneTitleAriaLabel={t('editMilestoneTitleAriaLabel')}
              expandDetailsLabel={expandDetailsLabel}
              handleSaveTitle={handleSaveTitle}
              isChatBusy={isChatBusy}
              isDeleting={isDeleting}
              isFirst={isFirst}
              isLast={isLast}
              isMilestoneRunning={isMilestoneRunning}
              isMoving={isMoving}
              milestone={milestone}
              milestonePlayAriaLabel={t('milestonePlayAriaLabel')}
              milestonePlayTooltip={t('milestonePlayTooltip')}
              moveMilestoneDown={t('moveMilestoneDown')}
              moveMilestoneUp={t('moveMilestoneUp')}
              onDeleteMilestone={onDeleteMilestone}
              onMoveMilestone={onMoveMilestone}
              onRenameMilestone={onRenameMilestone}
              onRunMilestone={onRunMilestone}
              open={open}
              renaming={renaming}
              runningMilestoneId={runningMilestoneId}
              saveMilestoneTitleAriaLabel={t('saveMilestoneTitleAriaLabel')}
              setDraftTitle={setDraftTitle}
              setEditingTitle={setEditingTitle}
              showDelete={showDelete}
              titleEditContainerRef={titleEditContainerRef}
              titleEditInputId={titleEditInputId}
              titleEditInputRef={titleEditInputRef}
              editingTitle={editingTitle}
            />
            {isMilestoneRunning ? <MilestoneRunProgressStrip runningStep={runningStep} /> : null}
            <CollapsibleContent
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MilestoneItemTabs
                addCriteriaInputId={addCriteriaInputId}
                addCriteriaInputRef={addCriteriaInputRef}
                criteriaRows={criteriaRows}
                goalDraft={goalDraft}
                goalFieldId={goalFieldId}
                handleAddPassCriterion={handleAddPassCriterion}
                handleGoalSave={handleGoalSave}
                handleRemovePassCriterion={handleRemovePassCriterion}
                hasResult={hasResult}
                isMilestoneRunning={isMilestoneRunning}
                isPreparing={preparingMilestoneId === milestone.id}
                milestone={milestone}
                onPrepareMilestone={
                  onPrepareMilestone ? () => void onPrepareMilestone(milestone.id) : undefined
                }
                onSetMilestoneDataTask={
                  onSetMilestoneDataTask
                    ? (dataTask) => void onSetMilestoneDataTask(milestone.id, dataTask)
                    : undefined
                }
                savingGoal={savingGoal}
                savingPassCriteria={savingPassCriteria}
                setGoalDraft={setGoalDraft}
              />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  )
}

export const TimelineItem = memo(TimelineItemInner)
