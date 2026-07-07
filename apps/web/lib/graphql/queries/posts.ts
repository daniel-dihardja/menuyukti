export const POSTS_QUERY = `
  query Posts($first: Int) {
    posts(first: $first) {
      id
      title
      status
      caption
      mediaType
      locationId
      workspaceId
      createdAt
      updatedAt
      pages {
        id
        sortOrder
        mediaS3Key
      }
    }
  }
`

export type PostsData = {
  posts: Array<{
    id: string
    title: string | null
    status: string
    caption: string | null
    mediaType: string | null
    locationId: number | null
    workspaceId: string | null
    createdAt: string | null
    updatedAt: string | null
    pages: Array<{
      id: string
      sortOrder: number
      mediaS3Key: string | null
    }>
  }>
}

export const POST_QUERY = `
  query Post($id: ID!) {
    post(id: $id) {
      id
      title
      status
      caption
      mediaType
      workspaceId
      pages {
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
      }
    }
  }
`

export type PostPageMediaVersion = {
  id: string
  mediaS3Key: string
  prompt: string | null
  createdAt: string | null
}

export type PostData = {
  post: {
    id: string
    title: string | null
    status: string
    caption: string | null
    mediaType: string | null
    workspaceId: string | null
    pages: Array<{
      id: string
      sortOrder: number
      mediaS3Key: string | null
      prompt: string | null
      mediaVersions: PostPageMediaVersion[]
    }>
  } | null
}

export const CREATE_POST_MUTATION = `
  mutation CreatePost($title: String) {
    createPost(title: $title) {
      id
      title
      status
      workspaceId
      locationId
      pages {
        id
        sortOrder
      }
    }
  }
`

export type CreatePostData = {
  createPost: {
    id: string
    title: string | null
    status: string
    workspaceId: string | null
    locationId: number | null
    pages: Array<{
      id: string
      sortOrder: number
    }>
  }
}

export const DELETE_POST_MUTATION = `
  mutation DeletePost($id: ID!) {
    deletePost(id: $id)
  }
`

export type DeletePostData = {
  deletePost: boolean
}

export const UPDATE_POST_PAGE_MUTATION = `
  mutation UpdatePostPage($id: ID!, $mediaS3Key: String, $prompt: String) {
    updatePostPage(id: $id, mediaS3Key: $mediaS3Key, prompt: $prompt) {
      id
      sortOrder
      mediaS3Key
      prompt
    }
  }
`

export type UpdatePostPageData = {
  updatePostPage: {
    id: string
    sortOrder: number
    mediaS3Key: string | null
    prompt: string | null
  }
}

export const DELETE_POST_PAGE_MEDIA_VERSION_MUTATION = `
  mutation DeletePostPageMediaVersion($pageId: ID!, $mediaS3Key: String!) {
    deletePostPageMediaVersion(pageId: $pageId, mediaS3Key: $mediaS3Key) {
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
    }
  }
`

export const CREATE_POST_PAGE_MUTATION = `
  mutation CreatePostPage($postId: ID!, $mediaS3Key: String, $prompt: String) {
    createPostPage(postId: $postId, mediaS3Key: $mediaS3Key, prompt: $prompt) {
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
    }
  }
`

export type CreatePostPageData = {
  createPostPage: {
    id: string
    sortOrder: number
    mediaS3Key: string | null
    prompt: string | null
    mediaVersions: PostPageMediaVersion[]
  }
}

export type DeletePostPageMediaVersionData = {
  deletePostPageMediaVersion: {
    id: string
    sortOrder: number
    mediaS3Key: string | null
    prompt: string | null
    mediaVersions: PostPageMediaVersion[]
  }
}
