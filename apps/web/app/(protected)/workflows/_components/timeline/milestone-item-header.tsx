'use client'

import type { RefObject } from 'react'
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

import type { TimelineMilestone } from './types'

export type MilestoneItemHeaderProps = {
  milestone: TimelineMilestone
  editingTitle: boolean
  setEditingTitle: (open: boolean) => void
  draftTitle: string
  setDraftTitle: (title: string) => void
  titleEditInputId: string
  titleEditInputRef: RefObject<HTMLInputElement | null>
  titleEditContainerRef: RefObject<HTMLDivElement | null>
  renaming: boolean
  open: boolean
  expandDetailsLabel: string
  collapseDetailsLabel: string
  editMilestoneTitleAriaLabel: string
  saveMilestoneTitleAriaLabel: string
  milestonePlayAriaLabel: string
  milestonePlayTooltip: string
  moveMilestoneUp: string
  moveMilestoneDown: string
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  onRunMilestone?: (id: string) => void | Promise<void>
  onMoveMilestone?: (id: string, direction: 'up' | 'down') => void | Promise<void>
  isFirst: boolean
  isLast: boolean
  isMoving: boolean
  isMilestoneRunning: boolean
  isChatBusy: boolean
  runningMilestoneId: string | null
  showDelete: boolean
  onDeleteMilestone?: (id: string) => void | Promise<void>
  isDeleting: boolean
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  deleteMilestoneConfirmTitle: string
  deleteMilestoneConfirmDescription: string
  deleteMilestoneConfirmCancel: string
  deleteMilestoneConfirmAction: string
  handleSaveTitle: () => Promise<void>
}

export function MilestoneItemHeader({
  milestone,
  editingTitle,
  setEditingTitle,
  draftTitle,
  setDraftTitle,
  titleEditInputId,
  titleEditInputRef,
  titleEditContainerRef,
  renaming,
  open,
  expandDetailsLabel,
  collapseDetailsLabel,
  editMilestoneTitleAriaLabel,
  saveMilestoneTitleAriaLabel,
  milestonePlayAriaLabel,
  milestonePlayTooltip,
  moveMilestoneUp,
  moveMilestoneDown,
  onRenameMilestone,
  onRunMilestone,
  onMoveMilestone,
  isFirst,
  isLast,
  isMoving,
  isMilestoneRunning,
  isChatBusy,
  runningMilestoneId,
  showDelete,
  onDeleteMilestone,
  isDeleting,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  deleteMilestoneConfirmTitle,
  deleteMilestoneConfirmDescription,
  deleteMilestoneConfirmCancel,
  deleteMilestoneConfirmAction,
  handleSaveTitle,
}: MilestoneItemHeaderProps) {
  return (
    <CardHeader className={cn('gap-1.5', editingTitle && 'gap-x-8')}>
      <CardTitle className="flex min-w-0 items-center gap-1 text-base leading-snug">
        {editingTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-1" ref={titleEditContainerRef}>
            <Input
              ref={titleEditInputRef}
              id={titleEditInputId}
              aria-label={editMilestoneTitleAriaLabel}
              className="h-8 min-w-0 flex-1 text-base font-semibold"
              disabled={renaming}
              onChange={(e) => setDraftTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') {
                  setEditingTitle(false)
                  setDraftTitle(milestone.title)
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSaveTitle()
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              value={draftTitle}
            />
            <Button
              aria-label={saveMilestoneTitleAriaLabel}
              className="size-9 shrink-0"
              disabled={renaming || !draftTitle.trim()}
              onClick={(e) => {
                e.stopPropagation()
                void handleSaveTitle()
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
              <span className="min-w-0 truncate">{milestone.title}</span>
              {onRenameMilestone ? (
                <Button
                  aria-label={editMilestoneTitleAriaLabel}
                  className="size-8 shrink-0 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDraftTitle(milestone.title)
                    setEditingTitle(true)
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
        {onRunMilestone ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  aria-busy={isMilestoneRunning ? true : undefined}
                  aria-label={milestonePlayAriaLabel}
                  className="size-9 shrink-0 rounded-full"
                  disabled={editingTitle || isChatBusy || runningMilestoneId !== null}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onRunMilestone(milestone.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  size="icon"
                  type="button"
                  variant="default"
                >
                  {isMilestoneRunning ? <Spinner /> : <Play aria-hidden data-icon="inline-start" />}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{milestonePlayTooltip}</TooltipContent>
          </Tooltip>
        ) : null}
        {onMoveMilestone ? (
          <>
            <Button
              aria-label={moveMilestoneUp}
              className="size-9 shrink-0 text-muted-foreground"
              disabled={isFirst || isMoving || editingTitle}
              onClick={(e) => {
                e.stopPropagation()
                void onMoveMilestone(milestone.id, 'up')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowUp aria-hidden data-icon="inline-start" />
            </Button>
            <Button
              aria-label={moveMilestoneDown}
              className="size-9 shrink-0 text-muted-foreground"
              disabled={isLast || isMoving || editingTitle}
              onClick={(e) => {
                e.stopPropagation()
                void onMoveMilestone(milestone.id, 'down')
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
        {showDelete && onDeleteMilestone ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                aria-label={deleteMilestoneAriaLabel}
                className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={isDeleting || editingTitle}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                size="icon"
                title={deleteButtonLabel}
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
                <AlertDialogTitle>{deleteMilestoneConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{deleteMilestoneConfirmDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()} type="button">
                  {deleteMilestoneConfirmCancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  className={cn(
                    buttonVariants({ variant: 'destructive' }),
                    isDeleting && 'inline-flex items-center gap-2',
                  )}
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onDeleteMilestone(milestone.id)
                  }}
                  type="button"
                >
                  {isDeleting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {deleteMilestoneConfirmAction}
                    </>
                  ) : (
                    deleteMilestoneConfirmAction
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        <CollapsibleTrigger asChild>
          <Button
            aria-expanded={open}
            aria-label={open ? collapseDetailsLabel : expandDetailsLabel}
            className="size-9 shrink-0"
            disabled={editingTitle}
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
