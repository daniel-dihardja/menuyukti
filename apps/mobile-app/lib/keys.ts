import * as ed from '@noble/ed25519'

import { bytesToHex, hexToBytes } from './hex'
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage'

export { bytesToHex, hexToBytes }

const PRIVATE_KEY_STORAGE_KEY = 'crm_device_ed25519_sk'

async function readPrivateKeyHex(): Promise<string | null> {
  return getSecureItem(PRIVATE_KEY_STORAGE_KEY)
}

async function writePrivateKeyHex(hex: string): Promise<void> {
  await setSecureItem(PRIVATE_KEY_STORAGE_KEY, hex)
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

/** Remove the device private key (e.g. on reset enrollment). */
export async function clearDeviceKeypair(): Promise<void> {
  await deleteSecureItem(PRIVATE_KEY_STORAGE_KEY)
}
