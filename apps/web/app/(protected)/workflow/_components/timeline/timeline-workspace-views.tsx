'use client'

import { useTranslations } from 'next-intl'

import { WorkflowTimelineSkeleton } from '../workflow-workspace-skeleton'
import { TimelineBody } from './timeline-body'

export function TimelineWorkspaceLoading() {
  return <WorkflowTimelineSkeleton className="min-h-0 flex-1" />
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

export function TimelineWorkspaceEmpty({ createError }: { createError: string | null }) {
  const t = useTranslations('analytics.workflows.chat')
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
      {createError ? (
        <p className="max-w-md text-destructive text-sm" role="alert">
          {createError}
        </p>
      ) : null}
    </div>
  )
}

export function TimelineWorkspaceMilestoneList() {
  return <TimelineBody />
}
