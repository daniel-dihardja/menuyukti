import type {
  PostCreatorDeleteTarget,
  PostCreatorImageVersion,
  PostCreatorPage,
  PostCreatorReferenceImage,
} from '@/lib/posts/post-creator-types'
import type { PostImageFormatId, PostImageQualityId } from '@/lib/posts/leonardo-post-dimensions'
import type { LeonardoPostModelId } from '@/lib/posts/leonardo-post-models'
import type { PostCreatorPreviewSource } from '@/lib/posts/post-creator-utils'

export type {
  PostCreatorDeleteTarget,
  PostCreatorImageVersion,
  PostCreatorPage,
  PostCreatorReferenceImage,
} from '@/lib/posts/post-creator-types'

export { MAX_POST_PAGES } from '@/lib/posts/post-creator-types'

export type PostCreatorMode = 'persisted' | 'ephemeral'

export type PostCreatorState = {
  pages: PostCreatorPage[]
  selectedPageId: string | null
  prompt: string
  imageVersions: PostCreatorImageVersion[]
  previewVersionIndex: number
  postImageVersionIndex: number
  referenceImages: PostCreatorReferenceImage[]
  templateImage: PostCreatorReferenceImage | null
  generationModel: LeonardoPostModelId
  imageFormat: PostImageFormatId
  imageQuality: PostImageQualityId
  safeZoneInsetXPx: number
  safeZoneInsetYPx: number
  solidBackgroundEnabled: boolean
  solidBackgroundColor: string
  previewSource: PostCreatorPreviewSource
  locationId: number | null
  styleId: number | null
  isGenerating: boolean
  isCommittingPostImage: boolean
  isDeletingVersion: boolean
  isAddingPage: boolean
  isDuplicatingPage: boolean
  isLoadingPost: boolean
  deleteDialogOpen: boolean
  deleteTarget: PostCreatorDeleteTarget
}

export type PostCreatorActions = {
  selectPage: (pageId: string) => void
  setPrompt: (value: string) => void
  generate: () => Promise<void>
  previewVersion: (index: number) => void
  commitPostImage: () => Promise<void>
  requestDelete: () => void
  confirmDelete: () => Promise<void>
  closeDeleteDialog: () => void
  addPage: () => Promise<void>
  duplicatePage: () => Promise<void>
  addReference: (photo: PostCreatorReferenceImage) => void
  removeReference: (name: string) => void
  toggleReferenceEnabled: (name: string, enabled: boolean) => void
  selectTemplate: (design: { name: string; url: string }) => void
  clearTemplate: () => void
  setGenerationModel: (model: LeonardoPostModelId) => void
  setImageFormat: (format: PostImageFormatId) => void
  setImageQuality: (quality: PostImageQualityId) => void
  setSafeZoneInsetXPx: (px: number) => void
  setSafeZoneInsetYPx: (px: number) => void
  setSolidBackgroundEnabled: (enabled: boolean) => void
  setSolidBackgroundColor: (color: string) => void
  setLocationId: (locationId: number | null) => void
  setStyleId: (styleId: number | null) => void
}

export type PostCreatorMeta = {
  mode: PostCreatorMode
  postId: string | null
  canPersistPages: boolean
  previewImageUrl: string | null
  previewMediaS3Key: string | null
  hasPreviewableVersion: boolean
  generationReferenceSummary: string | null
  canRemoveEmptyPage: boolean
  canAddPage: boolean
  canDuplicatePage: boolean
  canDelete: boolean
  selectedPageMediaS3Key: string | null | undefined
}

export type PostCreatorContextValue = {
  state: PostCreatorState
  actions: PostCreatorActions
  meta: PostCreatorMeta
}
