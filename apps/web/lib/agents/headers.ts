/**
 * Headers for server-to-server calls from the web BFF to `apps/agents`.
 * Uses the same shared secret as GraphQL (`GRAPHQL_INTERNAL_API_KEY`).
 */

export function buildAgentsHeaders(
  userId: string,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Menuyukti-User-Id': userId,
    ...extra,
  }
  const apiKey = process.env.GRAPHQL_INTERNAL_API_KEY
  if (!apiKey?.trim() && process.env.NODE_ENV === 'production') {
    throw new Error('GRAPHQL_INTERNAL_API_KEY must be set in production')
  }
  if (apiKey?.trim()) {
    headers['X-Internal-Api-Key'] = apiKey.trim()
  }
  return headers
}
