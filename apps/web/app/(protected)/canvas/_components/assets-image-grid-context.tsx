'use client'

import { createContext, use, type ReactNode } from 'react'

import type { AiFlowOption } from './assets-upload-zone'
import type { AssetItem } from './asset-item-types'

export type AssetsImageGridState = {
  loading: boolean
  items: AssetItem[]
  imageDimensionsByName: Record<string, { width: number; height: number }>
  cardFlows: Record<string, string>
  cardCustomPrompts: Record<string, string>
  aiFlows: AiFlowOption[]
  flowsLoading: boolean
  generatingByName: Record<string, boolean>
  deleting: string | null
  emptyTitle?: string
  emptyDescription?: string
  downloadHrefForName: (name: string) => string
}

export type AssetsImageGridActions = {
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onCardFlowChange: (name: string, value: string) => void
  onCardCustomPromptChange: (name: string, value: string) => void
  onPreview: (item: AssetItem) => void
  onDeleteRequest: (name: string) => void
  onGenerate: (item: AssetItem) => void
}

const AssetsImageGridStateContext = createContext<AssetsImageGridState | null>(null)
const AssetsImageGridActionsContext = createContext<AssetsImageGridActions | null>(null)

export function AssetsImageGridProvider({
  children,
  state,
  actions,
}: {
  children: ReactNode
  state: AssetsImageGridState
  actions: AssetsImageGridActions
}) {
  return (
    <AssetsImageGridStateContext value={state}>
      <AssetsImageGridActionsContext value={actions}>{children}</AssetsImageGridActionsContext>
    </AssetsImageGridStateContext>
  )
}

export function useAssetsImageGridState(): AssetsImageGridState {
  const ctx = use(AssetsImageGridStateContext)
  if (!ctx) {
    throw new Error('useAssetsImageGridState must be used within AssetsImageGridProvider')
  }
  return ctx
}

export function useAssetsImageGridActions(): AssetsImageGridActions {
  const ctx = use(AssetsImageGridActionsContext)
  if (!ctx) {
    throw new Error('useAssetsImageGridActions must be used within AssetsImageGridProvider')
  }
  return ctx
}
