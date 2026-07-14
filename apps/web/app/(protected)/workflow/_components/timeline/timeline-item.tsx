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
import { MilestoneItemProvider, type MilestoneItemTabValue } from './milestone-item-context'
import { MilestoneItemMobileRunModel } from './milestone-item-mobile-run-model'
import { TimelineItemHeaderProvider } from './timeline-item-header-context'
import { MilestoneItemTabs } from './milestone-item-tabs'
import { MilestoneRunProgressStrip } from './milestone-run-progress'
import { useMilestoneItemDrafts } from './use-milestone-item-drafts'
import type { PassCriteriaRow, TimelineMilestone } from './types'

/** When true, the listbox card must not handle Space/Enter (used for selection). */
function isKeyboardEventFromNestedInteractive(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof Element)) {
    return false
  }
  return (
    eventTarget.closest('textarea, input, select, button, a[href], [contenteditable="true"]') !==
    null
  )
}

import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import { campaignBriefInputFromMilestoneInput } from '@/lib/milestones/campaign-brief-input'

export type TimelineItemProps = {
  milestone: TimelineMilestone
  isFirst: boolean
  isLast: boolean
  /** Inline data preview below the card (narrow viewports only). */
  isMobile?: boolean
}

function TimelineItemInner({ milestone, isFirst, isLast, isMobile = false }: TimelineItemProps) {
  const t = useTranslations('analytics.workflows.chat')
  const actions = useTimelineActions()
  const { isBusy: isChatBusy } = useTimelineChat()
  const { milestoneState, selectedMilestoneId, onSelectMilestone } = useTimelineWorkspaceState()
  const {
    deletingMilestoneId,
    movingMilestoneId,
    savingPassCriteriaMilestoneId,
    savingDataMilestoneId,
    savingRunChatModelMilestoneId,
    runningMilestoneId,
    runningStep,
    runningStepIteration,
    runningReflectionRounds,
    runningReflectionAddressing,
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
    onUpdateMilestoneInput,
    onUpdateMilestoneRunChatModel,
    onMoveMilestone,
    onRunMilestone,
    onStopMilestoneRun,
  } = actions

  const [milestoneRunChatModel, setMilestoneRunChatModel] = useState<ChatGatewayModelId>(
    () => milestone.runChatModel ?? DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const { collapseAllEpoch } = useTimelineCollapse()
  const [userOpen, setUserOpen] = useState(false)
  const lastCollapseEpochRef = useRef(collapseAllEpoch)
  const lastMilestoneIdRef = useRef(milestone.id)
  const hadMilestoneDataRef = useRef(milestone.data != null)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const addCriteriaInputRef = useRef<HTMLInputElement>(null)
  const wasMilestoneRunningRef = useRef(false)
  const [activeTab, setActiveTab] = useState<MilestoneItemTabValue>('input')
  const isMilestoneRunning = runningMilestoneId === milestone.id
  const campaignBriefInput =
    milestone.presetId === 'restaurant_campaign_brief'
      ? campaignBriefInputFromMilestoneInput(milestone.milestoneInput)
      : null
  /** Keep the card expanded for the whole run; user can collapse again after the run ends. */
  const open = isMilestoneRunning || userOpen
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
  const savingInput = savingDataMilestoneId === milestone.id
  const savingRunChatModel = savingRunChatModelMilestoneId === milestone.id

  const { inputModel, handleRunMilestoneWithInputFlush } = useMilestoneItemDrafts(milestone, {
    onUpdateMilestoneInput,
    onRunMilestone,
    savingInput,
    isMilestoneRunning,
  })

  useEffect(() => {
    setMilestoneRunChatModel(milestone.runChatModel ?? DEFAULT_CHAT_GATEWAY_MODEL)
  }, [milestone.id, milestone.runChatModel])

  useEffect(() => {
    setActiveTab('input')
  }, [milestone.id])

  useEffect(() => {
    if (wasMilestoneRunningRef.current && !isMilestoneRunning && milestone.resultMarkdown?.trim()) {
      setActiveTab('result')
      setUserOpen(true)
    }
    wasMilestoneRunningRef.current = isMilestoneRunning
  }, [isMilestoneRunning, milestone.resultMarkdown])

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

  const hasResult = Boolean(milestone.resultMarkdown?.trim())

  const handleMilestoneRunChatModelChange = useCallback(
    (nextModel: ChatGatewayModelId) => {
      if (!onUpdateMilestoneRunChatModel || savingRunChatModel) {
        return
      }
      const previous = milestone.runChatModel ?? DEFAULT_CHAT_GATEWAY_MODEL
      if (nextModel === previous) {
        return
      }
      setMilestoneRunChatModel(nextModel)
      void (async () => {
        const ok = await onUpdateMilestoneRunChatModel(milestone.id, nextModel)
        if (!ok) {
          setMilestoneRunChatModel(previous)
        }
      })()
    },
    [milestone.id, milestone.runChatModel, onUpdateMilestoneRunChatModel, savingRunChatModel],
  )

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
      className="min-w-0 w-full cursor-pointer rounded-md outline-none [contain-intrinsic-size:0_200px] [content-visibility:auto] focus-visible:ring-2 focus-visible:ring-ring/60"
      data-milestone-card=""
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
      <div className={cn('min-w-0 w-full', !isLast && 'pb-8')}>
        <Collapsible className="min-w-0 w-full" onOpenChange={setUserOpen} open={open}>
          <Card
            className={cn(
              'min-w-0 w-full gap-0 bg-card py-4 shadow-none transition-[border-color,colors] dark:bg-muted',
              isSelected ? 'border border-primary' : 'border-0',
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
                onMilestoneRunChatModelChange: handleMilestoneRunChatModelChange,
                savingRunChatModel,
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
                  <MilestoneRunProgressStrip
                    passCriteria={criteriaRows}
                    presetId={milestone.presetId}
                    reflectionAddressing={runningReflectionAddressing}
                    reflectionEnabled={campaignBriefInput?.reflection.enabled}
                    reflectionMaxRevisions={campaignBriefInput?.reflection.maxRevisions}
                    reflectionRounds={runningReflectionRounds}
                    runningStep={runningStep}
                    runningStepIteration={runningStepIteration}
                  />
                </>
              ) : null}
              <CollapsibleContent
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MilestoneItemProvider
                  actions={{
                    handleAddPassCriterion,
                    handleRemovePassCriterion,
                    setActiveTab,
                  }}
                  meta={{
                    addCriteriaInputId,
                    addCriteriaInputRef,
                  }}
                  state={{
                    activeTab,
                    criteriaRows,
                    hasResult,
                    inputModel,
                    isMilestoneRunning,
                    milestone,
                    savingPassCriteria,
                  }}
                >
                  <MilestoneItemMobileRunModel />
                  <Separator />
                  <MilestoneItemTabs />
                </MilestoneItemProvider>
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
