'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'

import { MilestoneDataPreview } from '../milestone-preview/milestone-data-preview'
import { useTimelineCollapse } from './timeline-collapse-context'
import { useTimelineActions, useTimelineChat, useTimelineWorkspaceState } from '../timeline-context'
import { MilestoneItemHeader } from './milestone-item-header'
import { MilestoneItemMobileRunModel } from './milestone-item-mobile-run-model'
import { TimelineItemHeaderProvider } from './timeline-item-header-context'
import { MilestoneItemTabs } from './milestone-item-tabs'
import { MilestoneRunProgressStrip } from './milestone-run-progress'
import { isKeyboardEventFromNestedInteractive, TimelineRailMarker } from './timeline-rail'
import { useMilestoneItemDrafts } from './use-milestone-item-drafts'
import type { PassCriteriaRow, TimelineMilestone, TimelineMilestoneStatus } from './types'

import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

export type TimelineItemProps = {
  milestone: TimelineMilestone
  positionIndex: number
  isFirst: boolean
  isLast: boolean
  /** Inline data preview below the card (narrow viewports only). */
  isMobile?: boolean
}

function TimelineItemInner({
  milestone,
  positionIndex,
  isFirst,
  isLast,
  isMobile = false,
}: TimelineItemProps) {
  const t = useTranslations('analytics.workflows.chat')
  const actions = useTimelineActions()
  const { isBusy: isChatBusy } = useTimelineChat()
  const { milestoneState, selectedMilestoneId, onSelectMilestone } = useTimelineWorkspaceState()
  const {
    deletingMilestoneId,
    movingMilestoneId,
    savingPassCriteriaMilestoneId,
    savingGoalMilestoneId,
    savingDataMilestoneId,
    runningMilestoneId,
    runningStep,
  } = milestoneState
  const isSelected = milestone.id === selectedMilestoneId
  const showDelete = Boolean(actions.onDeleteMilestone)
  const onSelect = useCallback(
    (id: string) => {
      void onSelectMilestone(id)
    },
    [onSelectMilestone],
  )

  const {
    onDeleteMilestone,
    onUpdatePassCriteria,
    onUpdateMilestoneGoal,
    onUpdateMilestoneInput,
    onMoveMilestone,
    onRunMilestone,
    onStopMilestoneRun,
  } = actions

  const [milestoneRunChatModel, setMilestoneRunChatModel] = useState<ChatGatewayModelId>(
    () => DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const { collapseAllEpoch } = useTimelineCollapse()
  const [userOpen, setUserOpen] = useState(false)
  const lastCollapseEpochRef = useRef(collapseAllEpoch)
  const lastMilestoneIdRef = useRef(milestone.id)
  const hadMilestoneDataRef = useRef(milestone.data != null)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
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
    if (collapseAllEpoch === lastCollapseEpochRef.current) {
      return
    }
    lastCollapseEpochRef.current = collapseAllEpoch
    setUserOpen(false)
    if (isMobile) {
      setMobilePreviewOpen(false)
    }
  }, [collapseAllEpoch, isMobile])

  useEffect(() => {
    if (!isMobile) {
      return
    }
    const idChanged = lastMilestoneIdRef.current !== milestone.id
    if (idChanged) {
      lastMilestoneIdRef.current = milestone.id
      hadMilestoneDataRef.current = milestone.data != null
      setMobilePreviewOpen(false)
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

  const { inputModel, handleRunMilestoneWithInputFlush } = useMilestoneItemDrafts(milestone, {
    onUpdateMilestoneInput,
    onRunMilestone,
    savingInput,
    isMilestoneRunning,
  })

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
              <div aria-hidden className="h-4 w-px shrink-0 border-l border-dashed border-border" />
              <div className="mt-0.5 flex min-h-9 w-full items-center justify-center">
                <TimelineRailMarker status={status} />
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
      ) : null}
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-8')}>
        <Collapsible className="min-w-0 w-full" onOpenChange={setUserOpen} open={open}>
          <Card
            className={cn(
              'min-w-0 w-full gap-0 border py-4 shadow-none transition-[background-color,border-color]',
              isSelected ? 'border-primary bg-accent/50' : 'hover:bg-accent/30',
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
                  stopRun: isMilestoneRunning ? onStopMilestoneRun : undefined,
                  deleteMilestone: onDeleteMilestone,
                },
              }}
            >
              <MilestoneItemHeader open={open} />
              {isMilestoneRunning ? (
                <>
                  <Separator />
                  <MilestoneRunProgressStrip runningStep={runningStep} />
                </>
              ) : null}
              <CollapsibleContent
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MilestoneItemMobileRunModel />
                <Separator />
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
              className="mt-2 min-w-0 overflow-hidden rounded-lg bg-muted/50 shadow-sm"
              onOpenChange={setMobilePreviewOpen}
              open={mobilePreviewOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  className="h-auto min-h-10 w-full justify-between gap-2 px-3 py-2.5 font-medium text-muted-foreground"
                  type="button"
                  variant="ghost"
                >
                  <span className="min-w-0 truncate">{t('milestonePreviewToggle')}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'text-muted-foreground transition-transform',
                      mobilePreviewOpen && 'rotate-180',
                    )}
                    data-icon="inline-end"
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="min-w-0 overflow-x-hidden px-3 py-3">
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
