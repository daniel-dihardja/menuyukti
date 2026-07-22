export const INSTAGRAM_ITEM_FIELDS = `
  id
  workflowId
  locationId
  kind
  title
  caption
  hook
  visualBrief
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
  status: string
  schedule: string | null
  createdAt: string | null
  updatedAt: string | null
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
    $schedule: DateTime
  ) {
    createInstagramItem(
      workflowId: $workflowId
      kind: $kind
      title: $title
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
