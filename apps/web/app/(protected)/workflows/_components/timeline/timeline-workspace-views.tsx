'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

import { TimelineBody } from './timeline-body'

export function TimelineWorkspaceLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8"
    >
      <Skeleton className="h-8 w-full max-w-lg" />
      <Skeleton className="h-28 w-full max-w-lg" />
      <Skeleton className="h-28 w-full max-w-lg" />
    </div>
  )
}

export function TimelineWorkspaceLoadError({ message }: { message: string }) {
  return (
    <p
      className="flex flex-1 items-center justify-center p-8 text-center text-destructive text-sm"
      role="alert"
    >
      {message}
    </p>
  )
}

export function TimelineWorkspaceEmpty({
  creating,
  createError,
  onCreateMilestone,
  timelineTrailing,
}: {
  creating: boolean
  createError: string | null
  onCreateMilestone: () => void | Promise<void>
  timelineTrailing: ReactNode
}) {
  const t = useTranslations('analytics.campaigns.chat')
  return (
    <div
      aria-labelledby="timeline-empty-heading"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
      role="region"
    >
      <div className="flex max-w-md flex-col gap-2">
        <h3 className="font-medium text-foreground text-lg" id="timeline-empty-heading">
          {t('timelineEmptyTitle')}
        </h3>
        <p className="text-muted-foreground text-sm">{t('timelineEmptyDescription')}</p>
      </div>
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  aria-busy={creating}
                  aria-label={creating ? t('creatingMilestone') : t('createMilestone')}
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
              <p>{creating ? t('creatingMilestone') : t('createMilestone')}</p>
            </TooltipContent>
          </Tooltip>
          {timelineTrailing}
        </div>
      </TooltipProvider>
      {createError ? (
        <p className="max-w-md text-destructive text-sm" role="alert">
          {createError}
        </p>
      ) : null}
    </div>
  )
}

export function TimelineWorkspaceMilestoneList({
  selectedMilestoneId,
  onSelectMilestone,
}: {
  selectedMilestoneId: string | null
  onSelectMilestone: (id: string | null) => void | Promise<void>
}) {
  return (
    <TimelineBody
      onSelectMilestone={(id) => {
        void onSelectMilestone(id)
      }}
      selectedId={selectedMilestoneId}
    />
  )
}
