/**
 * Shared GraphQL client for the web app. All data is fetched via the GraphQL service.
 */

import { cache } from 'react'

const getEndpoint = (): string => {
  const endpoint = process.env.GRAPHQL_ENDPOINT
  if (!endpoint) {
    throw new Error('GRAPHQL_ENDPOINT is not set')
  }
  return endpoint
}

/** Host/path for error messages (no query string; strips userinfo if present). */
function endpointLabel(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname === '/' ? '' : u.pathname}`
  } catch {
    return url
  }
}

function formatGraphqlFetchError(endpoint: string, err: unknown): string {
  const label = endpointLabel(endpoint)
  const hint =
    'Check GRAPHQL_ENDPOINT in apps/web/.env, ensure the GraphQL app is running (e.g. make run in apps/graphql), ' +
    'and that the URL is reachable from the Next.js server (use host.docker.internal instead of localhost if the web app runs in Docker).'
  let detail = ''
  if (err instanceof Error) {
    const withCause = err as Error & { cause?: unknown }
    if (withCause.cause instanceof Error) {
      detail = ` ${withCause.cause.message}`
    } else if (err.message && err.message !== 'fetch failed') {
      detail = ` ${err.message}`
    }
  }
  return `GraphQL request failed: could not connect to ${label}.${detail} ${hint}`
}

export type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string; extensions?: { code?: string } }>
}

export class GraphQLRequestError extends Error {
  readonly codes: string[]

  constructor(message: string, codes: string[] = []) {
    super(message)
    this.name = 'GraphQLRequestError'
    this.codes = codes
  }
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

export const graphqlQuery = cache(async function graphqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  userId?: string,
  operationName?: string,
): Promise<T> {
  const body: Record<string, unknown> = { query, variables }
  if (operationName) {
    body.operationName = operationName
  }
  const endpoint = getEndpoint()
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(userId),
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(formatGraphqlFetchError(endpoint, err))
  }

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ')
    const codes = json.errors
      .map((e) => e.extensions?.code)
      .filter((code): code is string => Boolean(code))
    throw new GraphQLRequestError(msg || 'GraphQL error', codes)
  }

  if (json.data == null) {
    throw new Error('GraphQL returned no data')
  }

  return json.data
})
