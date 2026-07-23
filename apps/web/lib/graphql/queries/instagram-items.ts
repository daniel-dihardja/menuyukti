export type InstagramItemReferenceImageDto = {
  name: string
  enabled: boolean
}

export type InstagramItemPageMediaVersionDto = {
  id: string
  mediaS3Key: string
  prompt: string | null
  createdAt: string | null
  /** Presigned GET URL from BFF; not a GraphQL field. */
  imageUrl?: string | null
}

export type InstagramItemPageDto = {
  id: string
  sortOrder: number
  mediaS3Key: string | null
  prompt: string | null
  mediaVersions: InstagramItemPageMediaVersionDto[]
  createdAt?: string | null
  updatedAt?: string | null
  /** Presigned GET URL from BFF when mediaS3Key is set; not a GraphQL field. */
  imageUrl?: string | null
}

export const INSTAGRAM_ITEM_PAGE_FIELDS = `
  id
  sortOrder
  mediaS3Key
  prompt
  mediaVersions {
    id
    mediaS3Key
    prompt
    createdAt
  }
  createdAt
  updatedAt
`

export const INSTAGRAM_ITEM_FIELDS = `
  id
  workflowId
  locationId
  kind
  title
  caption
  hook
  visualBrief
  generationPrompt
  referenceImages {
    name
    enabled
  }
  pages {
    ${INSTAGRAM_ITEM_PAGE_FIELDS}
  }
  styleId
  status
  schedule
  createdAt
  updatedAt
`

export type InstagramItemDto = {
  id: string
  workflowId: string
  locationId: number
  kind: string
  title: string | null
  caption: string | null
  hook: string | null
  visualBrief: string | null
  generationPrompt: string | null
  referenceImages: InstagramItemReferenceImageDto[]
  pages: InstagramItemPageDto[]
  styleId: number | null
  status: string
  schedule: string | null
  createdAt: string | null
  updatedAt: string | null
  /** Cover image from first page (BFF); not a GraphQL field. */
  imageUrl?: string | null
}

export const INSTAGRAM_ITEMS_QUERY = `
  query InstagramItems($workflowId: ID!) {
    instagramItems(workflowId: $workflowId) {
      ${INSTAGRAM_ITEM_FIELDS}
    }
  }
`

export type InstagramItemsData = {
  instagramItems: InstagramItemDto[]
}

export const INSTAGRAM_ITEM_QUERY = `
  query InstagramItem($id: ID!) {
    instagramItem(id: $id) {
      ${INSTAGRAM_ITEM_FIELDS}
    }
  }
`

export type InstagramItemData = {
  instagramItem: InstagramItemDto | null
}

export const CREATE_INSTAGRAM_ITEM_MUTATION = `
  mutation CreateInstagramItem(
    $workflowId: ID!
    $kind: String!
    $title: String
    $caption: String
    $hook: String
    $visualBrief: String
    $status: String
    $schedule: DateTime
  ) {
    createInstagramItem(
      workflowId: $workflowId
      kind: $kind
      title: $title
      caption: $caption
      hook: $hook
      visualBrief: $visualBrief
      status: $status
      schedule: $schedule
    ) {
      ${INSTAGRAM_ITEM_FIELDS}
    }
  }
`

export type CreateInstagramItemData = {
  createInstagramItem: InstagramItemDto
}

export const UPDATE_INSTAGRAM_ITEM_MUTATION = `
  mutation UpdateInstagramItem(
    $id: ID!
    $kind: String
    $title: String
    $caption: String
    $hook: String
    $visualBrief: String
    $generationPrompt: String
    $referenceImages: [InstagramItemReferenceImageInput!]
    $styleId: Int
    $status: String
    $schedule: DateTime
  ) {
    updateInstagramItem(
      id: $id
      kind: $kind
      title: $title
      caption: $caption
      hook: $hook
      visualBrief: $visualBrief
      generationPrompt: $generationPrompt
      referenceImages: $referenceImages
      styleId: $styleId
      status: $status
      schedule: $schedule
    ) {
      ${INSTAGRAM_ITEM_FIELDS}
    }
  }
`

export type UpdateInstagramItemData = {
  updateInstagramItem: InstagramItemDto
}

export const DELETE_INSTAGRAM_ITEM_MUTATION = `
  mutation DeleteInstagramItem($id: ID!) {
    deleteInstagramItem(id: $id)
  }
`

export type DeleteInstagramItemData = {
  deleteInstagramItem: boolean
}

export const CREATE_INSTAGRAM_ITEM_PAGE_MUTATION = `
  mutation CreateInstagramItemPage(
    $itemId: ID!
    $mediaS3Key: String
    $prompt: String
  ) {
    createInstagramItemPage(
      itemId: $itemId
      mediaS3Key: $mediaS3Key
      prompt: $prompt
    ) {
      ${INSTAGRAM_ITEM_PAGE_FIELDS}
    }
  }
`

export type CreateInstagramItemPageData = {
  createInstagramItemPage: InstagramItemPageDto
}

export const UPDATE_INSTAGRAM_ITEM_PAGE_MUTATION = `
  mutation UpdateInstagramItemPage(
    $id: ID!
    $mediaS3Key: String
    $prompt: String
  ) {
    updateInstagramItemPage(
      id: $id
      mediaS3Key: $mediaS3Key
      prompt: $prompt
    ) {
      ${INSTAGRAM_ITEM_PAGE_FIELDS}
    }
  }
`

export type UpdateInstagramItemPageData = {
  updateInstagramItemPage: InstagramItemPageDto
}

export const DELETE_INSTAGRAM_ITEM_PAGE_MUTATION = `
  mutation DeleteInstagramItemPage($pageId: ID!) {
    deleteInstagramItemPage(pageId: $pageId)
  }
`

export type DeleteInstagramItemPageData = {
  deleteInstagramItemPage: boolean
}

export const DELETE_INSTAGRAM_ITEM_PAGE_MEDIA_VERSION_MUTATION = `
  mutation DeleteInstagramItemPageMediaVersion($pageId: ID!, $mediaS3Key: String!) {
    deleteInstagramItemPageMediaVersion(pageId: $pageId, mediaS3Key: $mediaS3Key) {
      ${INSTAGRAM_ITEM_PAGE_FIELDS}
    }
  }
`

export type DeleteInstagramItemPageMediaVersionData = {
  deleteInstagramItemPageMediaVersion: InstagramItemPageDto
}

/** @deprecated Use InstagramItemPageMediaVersionDto */
export type InstagramItemMediaVersionDto = InstagramItemPageMediaVersionDto
