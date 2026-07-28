export type EnrollInput = {
  token: string
  appId: string
  publicKey: string
  platform: string
  phoneE164?: string
}

export type EnrollResult = {
  customerId: string
  deviceId: string
}

export type ParsedEnrollPayload = {
  token: string
  appId: string | null
  isDeepLink: boolean
}

const ENROLL_TIMEOUT_MS = 20_000

/**
 * Parse a pasted menuyukti://enroll?... URL, or treat the string as a raw token.
 */
export function parseEnrollInput(raw: string): ParsedEnrollPayload {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { token: '', appId: null, isDeepLink: false }
  }

  if (trimmed.startsWith('menuyukti://')) {
    try {
      const url = new URL(trimmed)
      const token = url.searchParams.get('token') ?? ''
      const appId = url.searchParams.get('app')
      return { token, appId, isDeepLink: true }
    } catch {
      return { token: trimmed, appId: null, isDeepLink: false }
    }
  }

  return { token: trimmed, appId: null, isDeepLink: false }
}

export function crmApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_CRM_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:8000'
}

function enrollErrorMessage(err: unknown, status?: number): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return 'Enrollment timed out. Check your connection and try again.'
    }
    if (err.message === 'Network request failed' || err.message.includes('Failed to fetch')) {
      return 'Could not reach the server. Check EXPO_PUBLIC_CRM_API_URL and your network.'
    }
    return err.message
  }
  if (status != null) return `Enroll failed (${status})`
  return 'Enrollment failed'
}

export async function enrollDevice(input: EnrollInput): Promise<EnrollResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ENROLL_TIMEOUT_MS)

  try {
    const response = await fetch(`${crmApiBaseUrl()}/crm/v1/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        token: input.token,
        appId: input.appId,
        publicKey: input.publicKey,
        platform: input.platform,
        ...(input.phoneE164 ? { phoneE164: input.phoneE164 } : {}),
      }),
    })

    const body = (await response.json().catch(() => ({}))) as {
      message?: string
      customerId?: string
      deviceId?: string
    }

    if (!response.ok) {
      throw new Error(body.message ?? enrollErrorMessage(null, response.status))
    }
    if (!body.customerId || !body.deviceId) {
      throw new Error('Enroll response missing customerId or deviceId')
    }
    return { customerId: body.customerId, deviceId: body.deviceId }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Enroll')) throw err
    if (err instanceof Error && err.message.includes('missing customerId')) throw err
    throw new Error(enrollErrorMessage(err))
  } finally {
    clearTimeout(timer)
  }
}
