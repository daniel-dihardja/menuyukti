import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Cross-platform string storage: SecureStore on native, localStorage on web demo.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch {
      return null
    }
  }
  return SecureStore.getItemAsync(key)
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(key, value)
      return
    } catch {
      throw new Error(`Could not persist ${key} in localStorage`)
    }
  }
  await SecureStore.setItemAsync(key, value)
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(key)
      return
    } catch {
      return
    }
  }
  await SecureStore.deleteItemAsync(key)
}
