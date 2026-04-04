/**
 * Shared GraphQL client for the web app. All data is fetched via the GraphQL service.
 */

const getEndpoint = (): string => {
  const endpoint = process.env.GRAPHQL_ENDPOINT
  if (!endpoint) {
    throw new Error('GRAPHQL_ENDPOINT is not set')
  }
  return endpoint
}

export type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

function buildHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = process.env.GRAPHQL_INTERNAL_API_KEY
  if (apiKey) {
    headers['X-Internal-Api-Key'] = apiKey
  }
  if (userId) {
    headers['X-User-Id'] = userId
  }
  return headers
}

export async function graphqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  userId?: string,
): Promise<T> {
  const res = await fetch(getEndpoint(), {
    method: 'POST',
    headers: buildHeaders(userId),
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error')
  }

  if (json.data == null) {
    throw new Error('GraphQL returned no data')
  }

  return json.data
}
