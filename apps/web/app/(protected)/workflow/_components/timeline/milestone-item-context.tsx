'use client'

import { createContext, use, type ReactNode, type RefObject } from 'react'

import type { MilestoneInputModel } from './milestone-item-input-model'
import type { PassCriteriaRow, TimelineMilestone } from './types'

export type MilestoneItemTabValue = 'input' | 'goal' | 'pass' | 'result' | 'help'

export type MilestoneItemState = {
  milestone: TimelineMilestone
  activeTab: MilestoneItemTabValue
  goalDraft: string
  criteriaRows: PassCriteriaRow[]
  hasResult: boolean
  isMilestoneRunning: boolean
  savingGoal: boolean
  savingPassCriteria: boolean
  inputModel: MilestoneInputModel
}

export type MilestoneItemActions = {
  setActiveTab: (value: MilestoneItemTabValue) => void
  setGoalDraft: (v: string) => void
  handleGoalSave: () => void
  handleAddPassCriterion: () => Promise<void>
  handleRemovePassCriterion: (index: number) => Promise<void>
}

export type MilestoneItemMeta = {
  goalFieldId: string
  addCriteriaInputId: string
  addCriteriaInputRef: RefObject<HTMLInputElement | null>
}

const MilestoneItemStateContext = createContext<MilestoneItemState | null>(null)
const MilestoneItemActionsContext = createContext<MilestoneItemActions | null>(null)
const MilestoneItemMetaContext = createContext<MilestoneItemMeta | null>(null)

export function MilestoneItemProvider({
  children,
  state,
  actions,
  meta,
}: {
  children: ReactNode
  state: MilestoneItemState
  actions: MilestoneItemActions
  meta: MilestoneItemMeta
}) {
  return (
    <MilestoneItemStateContext value={state}>
      <MilestoneItemActionsContext value={actions}>
        <MilestoneItemMetaContext value={meta}>{children}</MilestoneItemMetaContext>
      </MilestoneItemActionsContext>
    </MilestoneItemStateContext>
  )
}

export function useMilestoneItemState(): MilestoneItemState {
  const ctx = use(MilestoneItemStateContext)
  if (!ctx) {
    throw new Error('useMilestoneItemState must be used within MilestoneItemProvider')
  }
  return ctx
}

export function useMilestoneItemActions(): MilestoneItemActions {
  const ctx = use(MilestoneItemActionsContext)
  if (!ctx) {
    throw new Error('useMilestoneItemActions must be used within MilestoneItemProvider')
  }
  return ctx
}

export function useMilestoneItemMeta(): MilestoneItemMeta {
  const ctx = use(MilestoneItemMetaContext)
  if (!ctx) {
    throw new Error('useMilestoneItemMeta must be used within MilestoneItemProvider')
  }
  return ctx
}
