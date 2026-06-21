'use client'

import { createContext, use, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import type { ContentCatalogItem } from './content-catalog-types'

export type ContentMediaGridLabels = {
  previewImage: string
  previewVideo: string
  delete: string
  download: string
  emptyTitle: string
  emptyDescription: string
}

export type ContentMediaGridState = {
  loading: boolean
  items: ContentCatalogItem[]
  imageDimensionsByName: Record<string, { width: number; height: number }>
  deleting: string | null
  labels: ContentMediaGridLabels
  emptyIcon: LucideIcon
  skeletonCount: number
  defaultAspectRatio: string
}

export type ContentMediaGridActions = {
  onImageNaturalSize: (name: string, width: number, height: number) => void
  onVideoMetadata: (name: string, width: number, height: number) => void
  onPreview: (item: ContentCatalogItem) => void
  onDeleteRequest: (name: string) => void
  getDownloadHref: (name: string) => string
}

export type ContentMediaTileMode = 'static' | 'videoHoverPreview'

const ContentMediaGridStateContext = createContext<ContentMediaGridState | null>(null)
const ContentMediaGridActionsContext = createContext<ContentMediaGridActions | null>(null)
const ContentMediaTileModeContext = createContext<ContentMediaTileMode>('static')

export function ContentMediaGridProvider({
  children,
  state,
  actions,
  tileMode = 'static',
}: {
  children: ReactNode
  state: ContentMediaGridState
  actions: ContentMediaGridActions
  tileMode?: ContentMediaTileMode
}) {
  return (
    <ContentMediaGridStateContext value={state}>
      <ContentMediaGridActionsContext value={actions}>
        <ContentMediaTileModeContext value={tileMode}>{children}</ContentMediaTileModeContext>
      </ContentMediaGridActionsContext>
    </ContentMediaGridStateContext>
  )
}

export function useContentMediaGridState(): ContentMediaGridState {
  const ctx = use(ContentMediaGridStateContext)
  if (!ctx) {
    throw new Error('useContentMediaGridState must be used within ContentMediaGridProvider')
  }
  return ctx
}

export function useContentMediaGridActions(): ContentMediaGridActions {
  const ctx = use(ContentMediaGridActionsContext)
  if (!ctx) {
    throw new Error('useContentMediaGridActions must be used within ContentMediaGridProvider')
  }
  return ctx
}

export function useContentMediaTileMode(): ContentMediaTileMode {
  return use(ContentMediaTileModeContext)
}
