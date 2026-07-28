import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage'
import {
  parseStoredProfile,
  parseStoredSession,
  serializeProfile,
  serializeSession,
  type StoredProfile,
  type StoredSession,
} from './sessionCodec'

export type { StoredProfile, StoredSession }
export {
  parseStoredProfile,
  parseStoredSession,
  serializeProfile,
  serializeSession,
} from './sessionCodec'

const SESSION_STORAGE_KEY = 'crm_session_v1'
const PROFILE_STORAGE_KEY = 'crm_profile_v1'

export async function loadSession(): Promise<StoredSession | null> {
  return parseStoredSession(await getSecureItem(SESSION_STORAGE_KEY))
}

export async function saveSession(session: StoredSession): Promise<void> {
  await setSecureItem(SESSION_STORAGE_KEY, serializeSession(session))
}

export async function clearSession(): Promise<void> {
  await deleteSecureItem(SESSION_STORAGE_KEY)
}

export async function loadProfile(): Promise<StoredProfile | null> {
  return parseStoredProfile(await getSecureItem(PROFILE_STORAGE_KEY))
}

export async function saveProfile(profile: StoredProfile): Promise<void> {
  await setSecureItem(PROFILE_STORAGE_KEY, serializeProfile(profile))
}

export async function clearProfile(): Promise<void> {
  await deleteSecureItem(PROFILE_STORAGE_KEY)
}
