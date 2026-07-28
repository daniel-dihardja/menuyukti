export type EnrollInput = {
  token: string
  appId: string
  publicKey: string
  platform: string
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

function crmApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_CRM_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:8000'
}

export async function enrollDevice(input: EnrollInput): Promise<EnrollResult> {
  const response = await fetch(`${crmApiBaseUrl()}/crm/v1/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: input.token,
      appId: input.appId,
      publicKey: input.publicKey,
      platform: input.platform,
    }),
  })

  const body = (await response.json().catch(() => ({}))) as {
    message?: string
    customerId?: string
    deviceId?: string
  }

  if (!response.ok) {
    throw new Error(body.message ?? `Enroll failed (${response.status})`)
  }
  if (!body.customerId || !body.deviceId) {
    throw new Error('Enroll response missing customerId or deviceId')
  }
  return { customerId: body.customerId, deviceId: body.deviceId }
}
