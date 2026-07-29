import { ensureAccessToken } from './crmAuth'
import { crmApiBaseUrl } from './enroll'

const DEFAULT_TIMEOUT_MS = 20_000

export type CrmFetchOptions = {
  deviceId: string
  /** Override request timeout (ms). */
  timeoutMs?: number
}

/**
 * Authenticated fetch against the Next.js mobile CRM BFF.
 * Attaches Bearer access JWT; on 401, refreshes once (or challenge+verify) and retries.
 */
export async function crmFetch(
  path: string,
  init: RequestInit | undefined,
  options: CrmFetchOptions,
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const relative = path.startsWith('/') ? path : `/${path}`
  const url = `${crmApiBaseUrl()}/api/mobile/crm/v1${relative}`

  const doFetch = async (accessToken: string): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    try {
      return await fetch(url, {
        ...init,
        headers,
        signal: init?.signal ?? controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  let token = await ensureAccessToken(options.deviceId)
  let response = await doFetch(token)

  if (response.status === 401) {
    token = await ensureAccessToken(options.deviceId, { forceRefresh: true })
    response = await doFetch(token)
  }

  return response
}
