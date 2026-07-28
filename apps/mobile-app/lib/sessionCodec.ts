export type StoredSession = {
  customerId: string
  deviceId: string
  appId?: string
}

export type StoredProfile = {
  givenName: string
  familyName: string
  phoneE164: string
}

export function serializeSession(session: StoredSession): string {
  return JSON.stringify(session)
}

export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as unknown
    if (
      !data ||
      typeof data !== 'object' ||
      typeof (data as StoredSession).customerId !== 'string' ||
      typeof (data as StoredSession).deviceId !== 'string' ||
      !(data as StoredSession).customerId ||
      !(data as StoredSession).deviceId
    ) {
      return null
    }
    const session = data as StoredSession
    return {
      customerId: session.customerId,
      deviceId: session.deviceId,
      ...(typeof session.appId === 'string' && session.appId ? { appId: session.appId } : {}),
    }
  } catch {
    return null
  }
}

export function serializeProfile(profile: StoredProfile): string {
  return JSON.stringify(profile)
}

export function parseStoredProfile(raw: string | null): StoredProfile | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return null
    const p = data as Partial<StoredProfile>
    return {
      givenName: typeof p.givenName === 'string' ? p.givenName : '',
      familyName: typeof p.familyName === 'string' ? p.familyName : '',
      phoneE164: typeof p.phoneE164 === 'string' ? p.phoneE164 : '',
    }
  } catch {
    return null
  }
}
