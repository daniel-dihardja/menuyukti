/**
 * Derive the GraphQL service origin from GRAPHQL_ENDPOINT
 * (e.g. http://127.0.0.1:8000/graphql → http://127.0.0.1:8000).
 */
export function graphqlServiceOrigin(): string {
  const endpoint = process.env.GRAPHQL_ENDPOINT?.trim()
  if (!endpoint) {
    throw new Error('GRAPHQL_ENDPOINT is not set')
  }
  try {
    const url = new URL(endpoint)
    return url.origin
  } catch {
    throw new Error('GRAPHQL_ENDPOINT is not a valid URL')
  }
}
