import { clearAccessToken } from './accessToken'
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage'

const REFRESH_TOKEN_STORAGE_KEY = 'crm_refresh_token_v1'

export async function loadRefreshToken(): Promise<string | null> {
  return getSecureItem(REFRESH_TOKEN_STORAGE_KEY)
}

export async function saveRefreshToken(token: string): Promise<void> {
  await setSecureItem(REFRESH_TOKEN_STORAGE_KEY, token)
}

export async function clearRefreshToken(): Promise<void> {
  await deleteSecureItem(REFRESH_TOKEN_STORAGE_KEY)
}

/** Clear refresh (SecureStore) and access (memory). */
export async function clearAuthTokens(): Promise<void> {
  clearAccessToken()
  await clearRefreshToken()
}
