'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { CampaignMilestoneUiState } from './campaign-milestone-reducer'
import type { MilestoneDataTask, PassCriteriaRow } from './timeline/types'

export type TimelineContextValue = CampaignMilestoneUiState & {
  isChatBusy: boolean
  onCreateMilestone: () => void | Promise<void>
  onDeleteMilestone: (id: string) => void | Promise<void>
  onRenameMilestone: (id: string, name: string) => Promise<boolean>
  onMoveMilestone: (id: string, direction: 'up' | 'down') => void | Promise<void>
  onUpdatePassCriteria: (id: string, rows: PassCriteriaRow[]) => Promise<boolean>
  onUpdateMilestoneGoal: (id: string, goal: string) => Promise<boolean>
  onUpdateMilestoneData: (id: string, milestoneData: string) => Promise<boolean>
  onSetMilestoneDataTask: (id: string, dataTask: MilestoneDataTask) => Promise<boolean>
  onPrepareMilestone: (id: string) => void | Promise<void>
  onRunMilestone: (id: string) => void | Promise<void>
}

const TimelineContext = createContext<TimelineContextValue | null>(null)

export function TimelineProvider({
  children,
  value,
}: {
  children: ReactNode
  value: TimelineContextValue
}) {
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}

export function useTimelineContext(): TimelineContextValue {
  const ctx = useContext(TimelineContext)
  if (!ctx) {
    throw new Error('useTimelineContext must be used within TimelineProvider')
  }
  return ctx
}
