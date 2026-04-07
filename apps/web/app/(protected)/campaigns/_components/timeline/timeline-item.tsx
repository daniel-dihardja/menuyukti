'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Card } from '@workspace/ui/components/card'
import { Collapsible, CollapsibleContent } from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

import { MilestoneItemHeader } from './milestone-item-header'
import { MilestoneItemTabs } from './milestone-item-tabs'
import { MilestoneRunProgressStrip } from './milestone-run-progress'
import { isKeyboardEventFromNestedInteractive, TimelineRailMarker } from './timeline-rail'
import type {
  MilestoneDataTask,
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
  onDeleteMilestone?: (id: string) => void | Promise<void>
  isDeleting: boolean
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  deleteMilestoneConfirmTitle: string
  deleteMilestoneConfirmDescription: string
  deleteMilestoneConfirmCancel: string
  deleteMilestoneConfirmAction: string
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  renamingMilestoneId: string | null
  onUpdatePassCriteria?: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  savingPassCriteriaMilestoneId: string | null
  onUpdateMilestoneGoal?: (id: string, goal: string) => Promise<boolean>
  savingGoalMilestoneId: string | null
  onUpdateMilestoneData?: (id: string, milestoneData: string) => Promise<boolean>
  savingDataMilestoneId: string | null
  onSetMilestoneDataTask?: (id: string, dataTask: MilestoneDataTask) => Promise<boolean>
  onPrepareMilestone?: (id: string) => void | Promise<void>
  preparingMilestoneId?: string | null
  onMoveMilestone?: (id: string, direction: 'up' | 'down') => void | Promise<void>
  isMoving: boolean
  onRunMilestone?: (id: string) => void | Promise<void>
  /** True while the campaign chat request is in flight (any milestone). */
  isChatBusy?: boolean
  /** Milestone that initiated the current run; used for per-card loading affordance. */
  runningMilestoneId?: string | null
  /** Current graph step from the milestone run SSE stream. */
  runningStep?: string | null
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
  onDeleteMilestone,
  isDeleting,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  deleteMilestoneConfirmTitle,
  deleteMilestoneConfirmDescription,
  deleteMilestoneConfirmCancel,
  deleteMilestoneConfirmAction,
  onRenameMilestone,
  renamingMilestoneId,
  onUpdatePassCriteria,
  savingPassCriteriaMilestoneId,
  onUpdateMilestoneGoal,
  savingGoalMilestoneId,
  onUpdateMilestoneData,
  savingDataMilestoneId,
  onSetMilestoneDataTask,
  onPrepareMilestone,
  preparingMilestoneId = null,
  onMoveMilestone,
  isMoving,
  onRunMilestone,
  isChatBusy = false,
  runningMilestoneId = null,
  runningStep = null,
}: TimelineItemProps) {
  const [userOpen, setUserOpen] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(milestone.title)
  const [goalDraft, setGoalDraft] = useState(() => milestone.goal ?? '')
  const [dataDraft, setDataDraft] = useState(() => milestone.data ?? '')
  const titleEditInputId = `milestone-title-edit-${milestone.id}`
  const titleEditContainerRef = useRef<HTMLDivElement>(null)
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
  const savingData = savingDataMilestoneId === milestone.id

  useEffect(() => {
    setGoalDraft(milestone.goal ?? '')
  }, [milestone.id, milestone.goal])

  useEffect(() => {
    setDataDraft(milestone.data ?? '')
  }, [milestone.id, milestone.data])

  useEffect(() => {
    if (!editingTitle) {
      setDraftTitle(milestone.title)
    }
  }, [milestone.id, milestone.title, editingTitle])

  useEffect(() => {
    if (!editingTitle) {
      return
    }
    const el = document.getElementById(titleEditInputId)
    if (el instanceof HTMLInputElement) {
      el.focus()
      el.select()
    }
  }, [editingTitle, titleEditInputId])

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
    const el = document.getElementById(addCriteriaInputId)
    const raw = el instanceof HTMLInputElement ? el.value.trim() : ''
    if (!raw) {
      return
    }
    const next = [...criteriaRows, { requirement: raw, status: 'open' as const }]
    const ok = await onUpdatePassCriteria(milestone.id, next)
    if (ok && el instanceof HTMLInputElement) {
      el.value = ''
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
  const dataFieldId = `milestone-data-${milestone.id}`
  const hasResult = Boolean(milestone.resultMarkdown?.trim())

  const handleGoalBlur = () => {
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

  const handleDataBlur = () => {
    if (!onUpdateMilestoneData || savingData) {
      return
    }
    const server = milestone.data ?? ''
    if (dataDraft === server) {
      return
    }
    void (async () => {
      const ok = await onUpdateMilestoneData(milestone.id, dataDraft)
      if (!ok) {
        setDataDraft(server)
      }
    })()
  }

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
            <div aria-hidden className="h-4 w-px shrink-0 border-l border-dashed border-border" />
            <div className="mt-0.5 flex min-h-9 w-full items-center justify-center">
              <TimelineRailMarker labels={statusLabels} status={status} />
            </div>
            <span className="mt-0.5 text-center text-muted-foreground text-xs tabular-nums">
              {positionIndex}
            </span>
          </div>
        )}
        {isLast ? null : (
          <div aria-hidden className="min-h-0 w-px flex-1 border-l border-dashed border-border" />
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
              editingTitle={editingTitle}
            />
            {isMilestoneRunning ? <MilestoneRunProgressStrip runningStep={runningStep} /> : null}
            <CollapsibleContent
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MilestoneItemTabs
                addCriteriaInputId={addCriteriaInputId}
                criteriaRows={criteriaRows}
                dataDraft={dataDraft}
                dataFieldId={dataFieldId}
                goalDraft={goalDraft}
                goalFieldId={goalFieldId}
                handleAddPassCriterion={handleAddPassCriterion}
                handleDataBlur={handleDataBlur}
                handleGoalBlur={handleGoalBlur}
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
                savingData={savingData}
                savingGoal={savingGoal}
                savingPassCriteria={savingPassCriteria}
                setDataDraft={setDataDraft}
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
