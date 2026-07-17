import type { LeonardoPostModelId } from '@/lib/posts/leonardo-post-models'

export type PostCreatorReferenceImage = {
  name: string
  url: string
  enabled: boolean
}

export type PostCreatorImageVersion = {
  id: string
  mediaS3Key: string
  imageUrl: string
  createdAt: string
}

export type PostCreatorPage = {
  id: string
  sortOrder: number
  prompt: string | null
  imageUrl: string | null
  mediaS3Key?: string | null
  imageVersions?: PostCreatorImageVersion[]
  previewVersionIndex?: number
  referenceImages?: PostCreatorReferenceImage[]
  templateImage?: PostCreatorReferenceImage | null
  previewSource?: 'version' | 'template'
  generationModel?: LeonardoPostModelId
}

export type PostCreatorDeleteTarget = 'page' | 'version'

export const MAX_POST_PAGES = 10
