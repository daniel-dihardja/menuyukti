'use client'

import type { ReactNode } from 'react'

import { ListCollapse, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useTimelineCollapse } from './timeline-collapse-context'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

export type TimelineToolbarProps = {
  title: string
  count: number
  /** Toolbar buttons; omit by not rendering (composition over show* flags). */
  actions?: ReactNode
  /** Rendered after action buttons (e.g. preview toggle). */
  trailingSlot?: ReactNode
}

export function TimelineToolbar({ title, count, actions, trailingSlot }: TimelineToolbarProps) {
  const showActions = Boolean(actions) || Boolean(trailingSlot)

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-border/60 border-b bg-card px-2 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate font-semibold text-foreground text-sm">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {showActions ? (
        <TooltipProvider delayDuration={300}>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {trailingSlot}
          </div>
        </TooltipProvider>
      ) : null}
    </header>
  )
}

export function TimelineToolbarCollapseAllButton() {
  const t = useTranslations('analytics.workflows.chat')
  const { collapseAllMilestones } = useTimelineCollapse()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            aria-label={t('collapseAllMilestonesAriaLabel')}
            onClick={collapseAllMilestones}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ListCollapse aria-hidden />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{t('collapseAllMilestones')}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function TimelineToolbarCreateButton({
  createLabel,
  creatingLabel,
  onCreateMilestone,
  creating,
}: {
  createLabel: string
  creatingLabel: string
  onCreateMilestone: () => boolean | Promise<boolean>
  creating: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            aria-busy={creating}
            aria-label={creating ? creatingLabel : createLabel}
            disabled={creating}
            onClick={() => void onCreateMilestone()}
            size="icon"
            type="button"
            variant="default"
          >
            {creating ? <Spinner /> : <Plus aria-hidden />}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{creating ? creatingLabel : createLabel}</p>
      </TooltipContent>
    </Tooltip>
  )
}
