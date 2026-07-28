import type { MobileEnrollBody } from '@/app/api/mobile/crm/v1/enroll/schema'

import { graphqlServiceOrigin } from './graphql-origin'

export type CrmEnrollUpstreamSuccess = {
  ok: true
  status: number
  body: { customerId: string; deviceId: string } | Record<string, unknown>
}

export type CrmEnrollUpstreamFailure = {
  ok: false
  status: number
  body: { message: string }
}

export type CrmEnrollUpstreamResult = CrmEnrollUpstreamSuccess | CrmEnrollUpstreamFailure

const UPSTREAM_TIMEOUT_MS = 20_000

/**
 * Forward enroll to private GraphQL POST /crm/v1/enroll (no internal API key).
 */
export async function postCrmEnrollUpstream(
  body: MobileEnrollBody,
): Promise<CrmEnrollUpstreamResult> {
  const url = `${graphqlServiceOrigin()}/crm/v1/enroll`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        token: body.token,
        appId: body.appId,
        publicKey: body.publicKey,
        platform: body.platform,
        ...(body.phoneE164 ? { phoneE164: body.phoneE164 } : {}),
      }),
    })

    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) {
      const message =
        typeof json.message === 'string' && json.message.trim()
          ? json.message
          : `Enroll failed (${response.status})`
      return { ok: false, status: response.status, body: { message } }
    }

    return { ok: true, status: response.status, body: json }
  } catch (err) {
    console.error('[mobile/crm/enroll] upstream fetch failed', err)
    return {
      ok: false,
      status: 502,
      body: { message: 'Could not reach enrollment service' },
    }
  } finally {
    clearTimeout(timer)
  }
}
