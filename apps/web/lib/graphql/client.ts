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
  if (!apiKey?.trim() && process.env.NODE_ENV === 'production') {
    throw new Error('GRAPHQL_INTERNAL_API_KEY must be set in production')
  }
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
  operationName?: string,
): Promise<T> {
  const body: Record<string, unknown> = { query, variables }
  if (operationName) {
    body.operationName = operationName
  }
  const res = await fetch(getEndpoint(), {
    method: 'POST',
    headers: buildHeaders(userId),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ')
    throw new Error(msg || 'GraphQL error')
  }

  if (json.data == null) {
    throw new Error('GraphQL returned no data')
  }

  return json.data
}
