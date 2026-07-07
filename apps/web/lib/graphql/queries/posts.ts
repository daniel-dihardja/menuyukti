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
  }>
}

export const CREATE_POST_MUTATION = `
  mutation CreatePost($title: String) {
    createPost(title: $title) {
      id
      title
      status
      workspaceId
      locationId
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
  }
}
