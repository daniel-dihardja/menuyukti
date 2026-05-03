'use client'

import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Check, ChevronDown, Pencil, Play, Trash2 } from 'lucide-react'

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
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

import { useTimelineItemHeader } from './timeline-item-header-context'
import { TimelineRailMarker } from './timeline-rail'

export type MilestoneItemHeaderProps = {
  open: boolean
}

export function MilestoneItemHeader({ open }: MilestoneItemHeaderProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const { milestone, isMobile, position, runState, deleteState, titleEditor, movement, actions } =
    useTimelineItemHeader()
  const railStatus = milestone.status ?? 'empty'
  const canRun = Boolean(actions.run) && runState !== 'blocked'
  const isRunning = runState === 'running'

  return (
    <CardHeader className={cn('gap-1.5', titleEditor.editing && 'gap-x-8')}>
      <CardTitle className="flex min-w-0 items-center gap-1 text-base leading-snug">
        {titleEditor.editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1" ref={titleEditor.containerRef}>
            <Input
              ref={titleEditor.inputRef}
              id={titleEditor.inputId}
              aria-label={t('editMilestoneTitleAriaLabel')}
              className="h-8 min-w-0 flex-1 text-base font-semibold"
              disabled={titleEditor.renaming}
              onChange={(e) => titleEditor.setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') {
                  titleEditor.setEditing(false)
                  titleEditor.setDraft(milestone.title)
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void titleEditor.save()
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              value={titleEditor.draft}
            />
            <Button
              aria-label={t('saveMilestoneTitleAriaLabel')}
              className="size-9 shrink-0"
              disabled={titleEditor.renaming || !titleEditor.draft.trim()}
              onClick={(e) => {
                e.stopPropagation()
                void titleEditor.save()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              size="icon"
              type="button"
              variant="default"
            >
              <Check aria-hidden data-icon="inline-start" />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden">
              {isMobile && railStatus !== 'empty' ? (
                <span className="shrink-0">
                  <TimelineRailMarker compact status={railStatus} />
                </span>
              ) : null}
              <span className="min-w-0 truncate">{milestone.title}</span>
              {titleEditor.canRename ? (
                <Button
                  aria-label={t('editMilestoneTitleAriaLabel')}
                  className="size-8 shrink-0 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    titleEditor.setDraft(milestone.title)
                    titleEditor.setEditing(true)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Pencil aria-hidden data-icon="inline-start" />
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </CardTitle>
      <CardAction className="flex items-center gap-1">
        {actions.run ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  aria-busy={isRunning ? true : undefined}
                  aria-label={t('milestonePlayAriaLabel')}
                  className="size-9 shrink-0 rounded-full"
                  disabled={titleEditor.editing || !canRun}
                  onClick={(e) => {
                    e.stopPropagation()
                    void actions.run?.(milestone.id)
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
        ) : null}
        {movement.move ? (
          <>
            <Button
              aria-label={t('moveMilestoneUp')}
              className="size-9 shrink-0 text-muted-foreground"
              disabled={position === 'first' || movement.moving || titleEditor.editing}
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
              disabled={position === 'last' || movement.moving || titleEditor.editing}
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
                disabled={deleteState === 'deleting' || titleEditor.editing}
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
            disabled={titleEditor.editing}
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
