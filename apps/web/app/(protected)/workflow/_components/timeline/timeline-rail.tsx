'use client'

import { Check, Circle, Clock, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import type { TimelineMilestoneStatus } from './types'

/** When true, the listbox card must not handle Space/Enter (used for selection). */
export function isKeyboardEventFromNestedInteractive(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof Element)) {
    return false
  }
  return (
    eventTarget.closest('textarea, input, select, button, a[href], [contenteditable="true"]') !==
    null
  )
}

/** Shared layout box for every timeline status marker (default rail size). */
const TIMELINE_RAIL_MARKER_BOX = 'flex size-7 shrink-0 items-center justify-center'
/** Same nominal size; Check is scaled down — its SVG reads larger than Clock/Circle at identical `size-*`. */
const TIMELINE_RAIL_ICON = 'size-7 origin-center stroke-[2]'
const TIMELINE_RAIL_ICON_CHECK = cn(TIMELINE_RAIL_ICON, 'scale-[0.7]')

/** Compact marker for inline use inside card headers on mobile. */
const TIMELINE_RAIL_MARKER_BOX_COMPACT = 'flex size-5 shrink-0 items-center justify-center'
const TIMELINE_RAIL_ICON_COMPACT = 'size-5 origin-center stroke-[2]'
const TIMELINE_RAIL_ICON_CHECK_COMPACT = cn(TIMELINE_RAIL_ICON_COMPACT, 'scale-[0.75]')

export function TimelineRailMarker({
  status,
  compact = false,
}: {
  status: TimelineMilestoneStatus
  compact?: boolean
}) {
  const t = useTranslations('analytics.workflows.chat')
  const labels = {
    complete: t('milestoneStatusComplete'),
    failed: t('milestoneStatusFailed'),
    pending: t('milestoneStatusPending'),
    empty: t('milestoneStatusEmpty'),
  }

  const box = compact ? TIMELINE_RAIL_MARKER_BOX_COMPACT : TIMELINE_RAIL_MARKER_BOX
  const icon = compact ? TIMELINE_RAIL_ICON_COMPACT : TIMELINE_RAIL_ICON
  const iconCheck = compact ? TIMELINE_RAIL_ICON_CHECK_COMPACT : TIMELINE_RAIL_ICON_CHECK

  if (status === 'complete') {
    return (
      <span
        aria-label={labels.complete}
        className={cn(box, 'rounded-full bg-success text-success-foreground')}
        role="img"
      >
        <Check aria-hidden className={iconCheck} />
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span
        aria-label={labels.failed}
        className={cn(box, 'rounded-full bg-warning text-warning-foreground')}
        role="img"
      >
        <X aria-hidden className={iconCheck} />
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span aria-label={labels.pending} className={cn(box, 'text-muted-foreground')} role="img">
        <Clock aria-hidden className={icon} />
      </span>
    )
  }

  return (
    <span aria-label={labels.empty} className={cn(box, 'text-muted-foreground/80')} role="img">
      <Circle aria-hidden className={icon} />
    </span>
  )
}
