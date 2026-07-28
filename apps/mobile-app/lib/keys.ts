import * as ed from '@noble/ed25519'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const PRIVATE_KEY_STORAGE_KEY = 'crm_device_ed25519_sk'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim()
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex length')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function readPrivateKeyHex(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(PRIVATE_KEY_STORAGE_KEY) ?? null
    } catch {
      return null
    }
  }
  return SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY)
}

async function writePrivateKeyHex(hex: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(PRIVATE_KEY_STORAGE_KEY, hex)
      return
    } catch {
      throw new Error('Could not persist device key in localStorage')
    }
  }
  await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, hex)
}

export type DeviceKeypair = {
  publicKeyHex: string
}

/**
 * Load or create an Ed25519 device keypair.
 * Private key stays in Secure Store (native) or localStorage (web demo);
 * only the public key hex is returned.
 */
export async function ensureDeviceKeypair(): Promise<DeviceKeypair> {
  const existing = await readPrivateKeyHex()
  if (existing) {
    const secretKey = hexToBytes(existing)
    const publicKey = await ed.getPublicKeyAsync(secretKey)
    return { publicKeyHex: bytesToHex(publicKey) }
  }

  const secretKey = ed.utils.randomSecretKey()
  const publicKey = await ed.getPublicKeyAsync(secretKey)
  await writePrivateKeyHex(bytesToHex(secretKey))
  return { publicKeyHex: bytesToHex(publicKey) }
}
