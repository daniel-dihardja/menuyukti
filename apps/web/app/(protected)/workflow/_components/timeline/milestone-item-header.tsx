'use client'

import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, ChevronDown, Play, Trash2 } from 'lucide-react'

import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { milestonePresetIconFor } from '@/lib/milestones/milestone-icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog'
import { Button, buttonVariants } from '@workspace/ui/components/button'
import { CardAction, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { CollapsibleTrigger } from '@workspace/ui/components/collapsible'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

import { useTimelineItemHeader } from './timeline-item-header-context'
import { TimelineRailMarker } from './timeline-rail'

export type MilestoneItemHeaderProps = {
  open: boolean
}

export function MilestoneItemHeader({ open }: MilestoneItemHeaderProps) {
  const t = useTranslations('analytics.workflows.chat')
  const {
    milestone,
    isMobile,
    position,
    runState,
    deleteState,
    movement,
    milestoneRunChatModel,
    onMilestoneRunChatModelChange,
    actions,
  } = useTimelineItemHeader()
  const MilestoneIcon = milestonePresetIconFor(milestone.presetId)
  const railStatus = milestone.status ?? 'empty'
  const canRun = Boolean(actions.run) && runState !== 'blocked'
  const isRunning = runState === 'running'

  return (
    <CardHeader className={cn('min-w-0 gap-1.5', isMobile && 'px-3')}>
      <CardTitle className="flex min-w-0 items-center gap-1 text-base leading-snug">
        <div className="flex min-w-0 flex-1 items-center">
          <div className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden">
            {isMobile && railStatus !== 'empty' ? (
              <span className="shrink-0">
                <TimelineRailMarker compact status={railStatus} />
              </span>
            ) : null}
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MilestoneIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{milestone.title}</span>
            </span>
          </div>
        </div>
      </CardTitle>
      <CardAction className="flex items-center gap-1">
        {actions.run ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex shrink-0" onPointerDown={(e) => e.stopPropagation()}>
              <ChatGatewayModelSelect
                disabled={isRunning || runState === 'blocked'}
                onValueChange={onMilestoneRunChatModelChange}
                value={milestoneRunChatModel}
              />
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    aria-busy={isRunning ? true : undefined}
                    aria-label={t('milestonePlayAriaLabel')}
                    className="size-9 shrink-0 rounded-full"
                    disabled={!canRun}
                    onClick={(e) => {
                      e.stopPropagation()
                      void actions.run?.(milestone.id, milestoneRunChatModel)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    size="icon"
                    type="button"
                    variant="default"
                  >
                    {isRunning ? <Spinner /> : <Play aria-hidden data-icon="inline-start" />}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('milestonePlayTooltip')}</TooltipContent>
            </Tooltip>
          </span>
        ) : null}
        {movement.move ? (
          <>
            <Button
              aria-label={t('moveMilestoneUp')}
              className="size-9 shrink-0 text-muted-foreground"
              disabled={position === 'first' || movement.moving}
              onClick={(e) => {
                e.stopPropagation()
                void movement.move?.(milestone.id, 'up')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowUp aria-hidden data-icon="inline-start" />
            </Button>
            <Button
              aria-label={t('moveMilestoneDown')}
              className="size-9 shrink-0 text-muted-foreground"
              disabled={position === 'last' || movement.moving}
              onClick={(e) => {
                e.stopPropagation()
                void movement.move?.(milestone.id, 'down')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowDown aria-hidden data-icon="inline-start" />
            </Button>
          </>
        ) : null}
        {deleteState !== 'hidden' && actions.deleteMilestone ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                aria-label={t('deleteMilestoneAriaLabel')}
                className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deleteState === 'deleting'}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                size="icon"
                title={t('deleteMilestone')}
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden data-icon="inline-start" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteMilestoneConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteMilestoneConfirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()} type="button">
                  {t('deleteMilestoneConfirmCancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  className={cn(
                    buttonVariants({ variant: 'destructive' }),
                    deleteState === 'deleting' && 'inline-flex items-center gap-2',
                  )}
                  disabled={deleteState === 'deleting'}
                  onClick={(e) => {
                    e.stopPropagation()
                    void actions.deleteMilestone?.(milestone.id)
                  }}
                  type="button"
                >
                  {deleteState === 'deleting' ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {t('deleteMilestoneConfirmAction')}
                    </>
                  ) : (
                    t('deleteMilestoneConfirmAction')
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        <CollapsibleTrigger asChild>
          <Button
            aria-expanded={open}
            aria-label={open ? t('milestoneCollapseDetails') : t('milestoneExpandDetails')}
            className="size-9 shrink-0"
            onClick={(e) => e.stopPropagation()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'motion-safe:transition-transform motion-safe:duration-200',
                open ? 'rotate-180' : 'rotate-0',
              )}
              data-icon="inline-start"
            />
          </Button>
        </CollapsibleTrigger>
      </CardAction>
    </CardHeader>
  )
}
