'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type TimelineCollapseContextValue = {
  collapseAllEpoch: number
  collapseAllMilestones: () => void
}

const TimelineCollapseContext = createContext<TimelineCollapseContextValue | null>(null)

export function TimelineCollapseProvider({ children }: { children: ReactNode }) {
  const [collapseAllEpoch, setCollapseAllEpoch] = useState(0)
  const collapseAllMilestones = useCallback(() => {
    setCollapseAllEpoch((n) => n + 1)
  }, [])

  const value = useMemo(
    () => ({ collapseAllEpoch, collapseAllMilestones }),
    [collapseAllEpoch, collapseAllMilestones],
  )

  return (
    <TimelineCollapseContext.Provider value={value}>{children}</TimelineCollapseContext.Provider>
  )
}

export function useTimelineCollapse(): TimelineCollapseContextValue {
  const ctx = useContext(TimelineCollapseContext)
  if (!ctx) {
    throw new Error('useTimelineCollapse must be used within TimelineCollapseProvider')
  }
  return ctx
}
