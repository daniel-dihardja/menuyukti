'use client'

import { createContext, use, type ReactNode, type RefObject } from 'react'

import type { ContentCatalogItem } from '@/app/(protected)/content/_components/content-catalog-types'
import type { MediaCatalogItem, MediaCollection } from '@/lib/media/client-api'

export type CollectionFilter = 'all' | number

export type MediaState = {
  items: MediaCatalogItem[]
  collections: MediaCollection[]
  collectionFilter: CollectionFilter
  loading: boolean
  loadError: boolean
  uploading: boolean
  collectionsBusy: boolean
  dragActive: boolean
  deleting: string | null
  pendingDeleteName: string | null
  imageDimensionsByName: Record<string, { width: number; height: number }>
  preview: ContentCatalogItem | null
  selected: MediaCatalogItem | null
  addCollectionId: string
  organizeBarHeight: number
  currentCollection: MediaCollection | null
}

export type MediaActions = {
  setDragActive: (active: boolean) => void
  setPreview: (item: ContentCatalogItem | null) => void
  setPendingDeleteName: (name: string | null) => void
  setAddCollectionId: (id: string) => void
  setOrganizeBarHeight: (height: number) => void
  handleImageNaturalSize: (name: string, width: number, height: number) => void
  handleSelect: (item: ContentCatalogItem) => void
  handleFilterChange: (key: CollectionFilter) => void
  clearSelection: () => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onBrowse: () => void
  retryLoad: () => void
  confirmDelete: (name: string) => void
  createCollection: (name: string) => Promise<boolean>
  renameCollection: (id: number, name: string) => Promise<boolean>
  deleteCollection: (id: number) => Promise<boolean>
  addSelectedToCollection: () => void
  removeSelectedFromCurrent: () => void
}

export type MediaMeta = {
  inputRef: RefObject<HTMLInputElement | null>
}

export type MediaContextValue = {
  state: MediaState
  actions: MediaActions
  meta: MediaMeta
}

const MediaStateContext = createContext<MediaState | null>(null)
const MediaActionsContext = createContext<MediaActions | null>(null)
const MediaMetaContext = createContext<MediaMeta | null>(null)

export function MediaContextProvider({
  children,
  state,
  actions,
  meta,
}: {
  children: ReactNode
  state: MediaState
  actions: MediaActions
  meta: MediaMeta
}) {
  return (
    <MediaStateContext value={state}>
      <MediaActionsContext value={actions}>
        <MediaMetaContext value={meta}>{children}</MediaMetaContext>
      </MediaActionsContext>
    </MediaStateContext>
  )
}

export function useMediaState(): MediaState {
  const ctx = use(MediaStateContext)
  if (!ctx) throw new Error('useMediaState must be used within MediaProvider')
  return ctx
}

export function useMediaActions(): MediaActions {
  const ctx = use(MediaActionsContext)
  if (!ctx) throw new Error('useMediaActions must be used within MediaProvider')
  return ctx
}

export function useMediaMeta(): MediaMeta {
  const ctx = use(MediaMetaContext)
  if (!ctx) throw new Error('useMediaMeta must be used within MediaProvider')
  return ctx
}
