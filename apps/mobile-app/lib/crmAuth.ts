import { getAccessToken, setAccessToken } from './accessToken'
import { crmApiBaseUrl } from './enroll'
import { signChallengeNonce } from './keys'
import { clearAuthTokens, loadRefreshToken, saveRefreshToken } from './tokenStorage'

const AUTH_TIMEOUT_MS = 20_000
const ACCESS_NEAR_EXPIRY_SECONDS = 60

function authUrl(path: string): string {
  return `${crmApiBaseUrl()}/api/mobile/crm/v1${path}`
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  init?: { headers?: Record<string, string> },
): Promise<{ status: number; body: T & { message?: string } }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)
  try {
    const response = await fetch(authUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    const json = (await response.json().catch(() => ({}))) as T & { message?: string }
    return { status: response.status, body: json }
  } finally {
    clearTimeout(timer)
  }
}

/** Decode JWT `exp` without verifying signature (client-side freshness only). */
export function accessTokenExpiresAt(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    let json: string
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(padded)
      json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
    } else {
      json = Buffer.from(padded, 'base64').toString('utf8')
    }
    const data = JSON.parse(json) as { exp?: unknown }
    return typeof data.exp === 'number' ? data.exp : null
  } catch {
    return null
  }
}

function isAccessTokenFresh(token: string): boolean {
  const exp = accessTokenExpiresAt(token)
  if (exp == null) return false
  const nowSec = Math.floor(Date.now() / 1000)
  return exp - nowSec > ACCESS_NEAR_EXPIRY_SECONDS
}

export async function challengeAndVerify(deviceId: string): Promise<string> {
  const challenge = await postJson<{
    challengeId?: string
    nonce?: string
  }>('/auth/challenge', { deviceId })

  if (challenge.status !== 200 || !challenge.body.challengeId || !challenge.body.nonce) {
    throw new Error(challenge.body.message ?? 'Challenge failed')
  }

  const signature = await signChallengeNonce(challenge.body.nonce)
  const verify = await postJson<{ accessToken?: string }>('/auth/verify', {
    deviceId,
    challengeId: challenge.body.challengeId,
    signature,
  })

  if (verify.status !== 200 || !verify.body.accessToken) {
    throw new Error(verify.body.message ?? 'Verify failed')
  }

  setAccessToken(verify.body.accessToken)
  return verify.body.accessToken
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await loadRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const result = await postJson<{
    accessToken?: string
    refreshToken?: string
  }>('/auth/refresh', { refreshToken })

  if (result.status !== 200 || !result.body.accessToken || !result.body.refreshToken) {
    throw new Error(result.body.message ?? 'Refresh failed')
  }

  await saveRefreshToken(result.body.refreshToken)
  setAccessToken(result.body.accessToken)
  return result.body.accessToken
}

/**
 * Return a usable access JWT: memory if fresh, else refresh, else challenge+verify.
 * Pass `forceRefresh` to skip the memory cache (e.g. after a 401).
 */
export async function ensureAccessToken(
  deviceId: string,
  options?: { forceRefresh?: boolean },
): Promise<string> {
  const forceRefresh = options?.forceRefresh === true
  if (!forceRefresh) {
    const current = getAccessToken()
    if (current && isAccessTokenFresh(current)) {
      return current
    }
  }

  try {
    return await refreshAccessToken()
  } catch {
    return challengeAndVerify(deviceId)
  }
}

/**
 * Best-effort server revoke. Prefer refresh body; fall back to Bearer access.
 * Always clears local auth tokens afterward.
 */
export async function revokeDevice(): Promise<void> {
  const refreshToken = await loadRefreshToken()
  const access = getAccessToken()

  try {
    if (refreshToken) {
      await postJson('/auth/revoke', { refreshToken })
    } else if (access) {
      await postJson('/auth/revoke', {}, { headers: { Authorization: `Bearer ${access}` } })
    }
  } catch {
    // Best-effort — local clear still proceeds
  } finally {
    await clearAuthTokens()
  }
}
