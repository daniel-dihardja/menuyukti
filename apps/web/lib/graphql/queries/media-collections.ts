export type MediaAsset = {
  id: number
  workspaceId: number
  filename: string
  displayName: string | null
  createdByClerkUserId: string
}

export type MediaCollection = {
  id: number
  workspaceId: number
  name: string
  createdByClerkUserId: string
  memberCount: number
  members?: MediaAsset[]
}

const ASSET_FIELDS = `
  id
  workspaceId
  filename
  displayName
  createdByClerkUserId
`

const COLLECTION_FIELDS = `
  id
  workspaceId
  name
  createdByClerkUserId
  memberCount
`

const COLLECTION_WITH_MEMBERS_FIELDS = `
  ${COLLECTION_FIELDS}
  members {
    ${ASSET_FIELDS}
  }
`

export const MEDIA_COLLECTIONS_QUERY = `
  query MediaCollections($first: Int) {
    mediaCollections(first: $first) {
      ${COLLECTION_FIELDS}
    }
  }
`

export type MediaCollectionsData = {
  mediaCollections: MediaCollection[]
}

export const MEDIA_COLLECTION_QUERY = `
  query MediaCollection($id: Int!) {
    mediaCollection(id: $id) {
      ${COLLECTION_WITH_MEMBERS_FIELDS}
    }
  }
`

export type MediaCollectionData = {
  mediaCollection: MediaCollection | null
}

export const MEDIA_ASSETS_QUERY = `
  query MediaAssets($collectionId: Int, $first: Int) {
    mediaAssets(collectionId: $collectionId, first: $first) {
      ${ASSET_FIELDS}
    }
  }
`

export type MediaAssetsData = {
  mediaAssets: MediaAsset[]
}

export const ENSURE_MEDIA_ASSET_MUTATION = `
  mutation EnsureMediaAsset($filename: String!, $displayName: String) {
    ensureMediaAsset(filename: $filename, displayName: $displayName) {
      ${ASSET_FIELDS}
    }
  }
`

export type EnsureMediaAssetData = {
  ensureMediaAsset: MediaAsset
}

export const DELETE_MEDIA_ASSET_MUTATION = `
  mutation DeleteMediaAsset($filename: String!) {
    deleteMediaAsset(filename: $filename)
  }
`

export type DeleteMediaAssetData = {
  deleteMediaAsset: boolean
}

export const CREATE_MEDIA_COLLECTION_MUTATION = `
  mutation CreateMediaCollection($name: String!) {
    createMediaCollection(name: $name) {
      ${COLLECTION_FIELDS}
    }
  }
`

export type CreateMediaCollectionData = {
  createMediaCollection: MediaCollection
}

export const UPDATE_MEDIA_COLLECTION_MUTATION = `
  mutation UpdateMediaCollection($id: Int!, $name: String!) {
    updateMediaCollection(id: $id, name: $name) {
      ${COLLECTION_FIELDS}
    }
  }
`

export type UpdateMediaCollectionData = {
  updateMediaCollection: MediaCollection
}

export const DELETE_MEDIA_COLLECTION_MUTATION = `
  mutation DeleteMediaCollection($id: Int!) {
    deleteMediaCollection(id: $id)
  }
`

export type DeleteMediaCollectionData = {
  deleteMediaCollection: boolean
}

export const ADD_MEDIA_TO_COLLECTION_MUTATION = `
  mutation AddMediaToCollection($collectionId: Int!, $filename: String!) {
    addMediaToCollection(collectionId: $collectionId, filename: $filename) {
      ${COLLECTION_WITH_MEMBERS_FIELDS}
    }
  }
`

export type AddMediaToCollectionData = {
  addMediaToCollection: MediaCollection
}

export const REMOVE_MEDIA_FROM_COLLECTION_MUTATION = `
  mutation RemoveMediaFromCollection($collectionId: Int!, $filename: String!) {
    removeMediaFromCollection(collectionId: $collectionId, filename: $filename) {
      ${COLLECTION_WITH_MEMBERS_FIELDS}
    }
  }
`

export type RemoveMediaFromCollectionData = {
  removeMediaFromCollection: MediaCollection
}
