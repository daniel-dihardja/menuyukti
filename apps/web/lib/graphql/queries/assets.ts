export const IMAGE_AI_FLOWS_QUERY = `
  query ImageAiFlows($includeInactive: Boolean = false) {
    imageAiFlows(includeInactive: $includeInactive) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
      sortOrder
    }
  }
`

export type ImageAiFlowsData = {
  imageAiFlows: Array<{
    id: number
    slug: string
    displayName: string
    prompt: string
    model: string
    promptEnhance: string | null
    imageReferenceStrength: string | null
    styleIds: unknown
    isActive: boolean
    sortOrder: number
  }>
}

export const IMAGE_AI_FLOW_BY_SLUG_QUERY = `
  query ImageAiFlow($slug: String!) {
    imageAiFlow(slug: $slug) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
    }
  }
`

export type ImageAiFlowBySlugData = {
  imageAiFlow: {
    id: number
    slug: string
    displayName: string
    prompt: string
    model: string
    promptEnhance: string | null
    imageReferenceStrength: string | null
    styleIds: unknown
    isActive: boolean
  } | null
}

/** Single image AI flow row returned by mutations and list query. */
export type ImageAiFlowRow = {
  id: number
  slug: string
  displayName: string
  prompt: string
  model: string
  promptEnhance: string | null
  imageReferenceStrength: string | null
  styleIds: unknown
  isActive: boolean
  sortOrder: number
}

export const CREATE_IMAGE_AI_FLOW_MUTATION = `
  mutation CreateImageAiFlow(
    $slug: String!
    $displayName: String!
    $prompt: String!
    $model: String!
    $promptEnhance: String
    $imageReferenceStrength: String
    $styleIds: JSON
    $isActive: Boolean!
    $sortOrder: Int!
  ) {
    createImageAiFlow(
      slug: $slug
      displayName: $displayName
      prompt: $prompt
      model: $model
      promptEnhance: $promptEnhance
      imageReferenceStrength: $imageReferenceStrength
      styleIds: $styleIds
      isActive: $isActive
      sortOrder: $sortOrder
    ) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
      sortOrder
    }
  }
`

export type CreateImageAiFlowData = {
  createImageAiFlow: ImageAiFlowRow
}

export const UPDATE_IMAGE_AI_FLOW_MUTATION = `
  mutation UpdateImageAiFlow(
    $slug: String!
    $newSlug: String
    $displayName: String
    $prompt: String
    $model: String
    $promptEnhance: String
    $imageReferenceStrength: String
    $styleIds: JSON
    $isActive: Boolean
    $sortOrder: Int
  ) {
    updateImageAiFlow(
      slug: $slug
      newSlug: $newSlug
      displayName: $displayName
      prompt: $prompt
      model: $model
      promptEnhance: $promptEnhance
      imageReferenceStrength: $imageReferenceStrength
      styleIds: $styleIds
      isActive: $isActive
      sortOrder: $sortOrder
    ) {
      id
      slug
      displayName
      prompt
      model
      promptEnhance
      imageReferenceStrength
      styleIds
      isActive
      sortOrder
    }
  }
`

export type UpdateImageAiFlowData = {
  updateImageAiFlow: ImageAiFlowRow
}

export const DELETE_IMAGE_AI_FLOW_MUTATION = `
  mutation DeleteImageAiFlow($slug: String!) {
    deleteImageAiFlow(slug: $slug)
  }
`

export type DeleteImageAiFlowData = {
  deleteImageAiFlow: boolean
}
