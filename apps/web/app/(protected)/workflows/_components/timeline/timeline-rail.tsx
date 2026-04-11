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

/** Shared layout box for every timeline status marker. */
const TIMELINE_RAIL_MARKER_BOX = 'flex size-7 shrink-0 items-center justify-center'
/** Same nominal size; Check is scaled down — its SVG reads larger than Clock/Circle at identical `size-*`. */
const TIMELINE_RAIL_ICON = 'size-7 origin-center stroke-[2]'
const TIMELINE_RAIL_ICON_CHECK = cn(TIMELINE_RAIL_ICON, 'scale-[0.7]')

export function TimelineRailMarker({ status }: { status: TimelineMilestoneStatus }) {
  const t = useTranslations('analytics.campaigns.chat')
  const labels = {
    complete: t('milestoneStatusComplete'),
    failed: t('milestoneStatusFailed'),
    pending: t('milestoneStatusPending'),
    empty: t('milestoneStatusEmpty'),
  }

  if (status === 'complete') {
    return (
      <span
        aria-label={labels.complete}
        className={cn(
          TIMELINE_RAIL_MARKER_BOX,
          'rounded-full bg-green-600 text-white dark:bg-green-600',
        )}
        role="img"
      >
        <Check aria-hidden className={TIMELINE_RAIL_ICON_CHECK} />
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span
        aria-label={labels.failed}
        className={cn(
          TIMELINE_RAIL_MARKER_BOX,
          'rounded-full bg-amber-600 text-white dark:bg-amber-600',
        )}
        role="img"
      >
        <X aria-hidden className={TIMELINE_RAIL_ICON_CHECK} />
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span
        aria-label={labels.pending}
        className={cn(TIMELINE_RAIL_MARKER_BOX, 'text-muted-foreground')}
        role="img"
      >
        <Clock aria-hidden className={TIMELINE_RAIL_ICON} />
      </span>
    )
  }

  return (
    <span
      aria-label={labels.empty}
      className={cn(TIMELINE_RAIL_MARKER_BOX, 'text-muted-foreground/80')}
      role="img"
    >
      <Circle aria-hidden className={TIMELINE_RAIL_ICON} />
    </span>
  )
}
