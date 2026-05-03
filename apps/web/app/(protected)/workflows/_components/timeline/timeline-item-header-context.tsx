'use client'

import { createContext, useContext, type RefObject } from 'react'

import type { TimelineMilestone } from './types'

export type TimelineItemPosition = 'first' | 'middle' | 'last'
export type TimelineItemRunState = 'idle' | 'running' | 'blocked'
export type TimelineItemDeleteState = 'hidden' | 'idle' | 'deleting'

type TimelineItemHeaderContextValue = {
  milestone: TimelineMilestone
  /** When true, the left timeline rail is hidden; status is shown inside the card header. */
  isMobile?: boolean
  position: TimelineItemPosition
  runState: TimelineItemRunState
  deleteState: TimelineItemDeleteState
  titleEditor: {
    editing: boolean
    draft: string
    setEditing: (open: boolean) => void
    setDraft: (title: string) => void
    inputId: string
    inputRef: RefObject<HTMLInputElement | null>
    containerRef: RefObject<HTMLDivElement | null>
    renaming: boolean
    save: () => Promise<void>
    canRename: boolean
  }
  movement: {
    moving: boolean
    move?: (id: string, direction: 'up' | 'down') => void | Promise<void>
  }
  actions: {
    run?: (id: string) => void | Promise<void>
    deleteMilestone?: (id: string) => void | Promise<void>
  }
}

const TimelineItemHeaderContext = createContext<TimelineItemHeaderContextValue | null>(null)

export function TimelineItemHeaderProvider({
  value,
  children,
}: {
  value: TimelineItemHeaderContextValue
  children: React.ReactNode
}) {
  return (
    <TimelineItemHeaderContext.Provider value={value}>
      {children}
    </TimelineItemHeaderContext.Provider>
  )
}

export function useTimelineItemHeader() {
  const ctx = useContext(TimelineItemHeaderContext)
  if (!ctx) {
    throw new Error('useTimelineItemHeader must be used within TimelineItemHeaderProvider')
  }
  return ctx
}
