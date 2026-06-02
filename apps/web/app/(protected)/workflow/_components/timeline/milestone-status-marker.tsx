'use client'

import { Check, Circle, Clock, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import type { TimelineMilestoneStatus } from './types'

const MARKER_BOX = 'flex size-5 shrink-0 items-center justify-center'
const MARKER_ICON = 'size-5 origin-center stroke-[2]'
const MARKER_ICON_CHECK = cn(MARKER_ICON, 'scale-[0.75]')

export function MilestoneStatusMarker({ status }: { status: TimelineMilestoneStatus }) {
  const t = useTranslations('analytics.workflows.chat')
  const labels = {
    complete: t('milestoneStatusComplete'),
    failed: t('milestoneStatusFailed'),
    pending: t('milestoneStatusPending'),
    empty: t('milestoneStatusEmpty'),
  }

  if (status === 'complete') {
    return (
      <span aria-label={labels.complete} className={cn(MARKER_BOX, 'text-success')} role="img">
        <Check aria-hidden className={MARKER_ICON} />
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span
        aria-label={labels.failed}
        className={cn(MARKER_BOX, 'rounded-full bg-warning text-warning-foreground')}
        role="img"
      >
        <X aria-hidden className={MARKER_ICON_CHECK} />
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span
        aria-label={labels.pending}
        className={cn(MARKER_BOX, 'text-muted-foreground')}
        role="img"
      >
        <Clock aria-hidden className={MARKER_ICON} />
      </span>
    )
  }

  return (
    <span
      aria-label={labels.empty}
      className={cn(MARKER_BOX, 'text-muted-foreground/80')}
      role="img"
    >
      <Circle aria-hidden className={MARKER_ICON} />
    </span>
  )
}
