import { graphqlServiceOrigin } from './graphql-origin'

export type CrmUpstreamSuccess = {
  ok: true
  status: number
  body: Record<string, unknown>
}

export type CrmUpstreamFailure = {
  ok: false
  status: number
  body: { message: string }
}

export type CrmUpstreamResult = CrmUpstreamSuccess | CrmUpstreamFailure

const UPSTREAM_TIMEOUT_MS = 20_000

export type PostCrmUpstreamOptions = {
  /** Path under the GraphQL origin, e.g. `/crm/v1/enroll`. */
  path: string
  body: Record<string, unknown>
  /** Extra request headers (e.g. Authorization for revoke). */
  headers?: Record<string, string>
  /** Fallback message when upstream is unreachable. */
  unreachableMessage?: string
  /** Log label for failed upstream fetch. */
  logLabel?: string
}

/**
 * Forward a JSON POST to the private GraphQL CRM REST surface (no internal API key).
 */
export async function postCrmUpstream(options: PostCrmUpstreamOptions): Promise<CrmUpstreamResult> {
  const {
    path,
    body,
    headers = {},
    unreachableMessage = 'Could not reach CRM auth service',
    logLabel = 'mobile/crm',
  } = options

  const url = `${graphqlServiceOrigin()}${path.startsWith('/') ? path : `/${path}`}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })

    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) {
      const message =
        typeof json.message === 'string' && json.message.trim()
          ? json.message
          : `Request failed (${response.status})`
      return { ok: false, status: response.status, body: { message } }
    }

    return { ok: true, status: response.status, body: json }
  } catch (err) {
    console.error(`[${logLabel}] upstream fetch failed`, err)
    return {
      ok: false,
      status: 502,
      body: { message: unreachableMessage },
    }
  } finally {
    clearTimeout(timer)
  }
}
