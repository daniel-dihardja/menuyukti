import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'

import { bytesToHex, hexToBytes } from './hex'
import './polyfillCrypto'
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage'
import { signNonceWithPrivateKeyHex } from './signNonce'

export { bytesToHex, hexToBytes }

// React Native has no crypto.subtle — use noble-hashes (see @noble/ed25519 README).
ed.hashes.sha512 = sha512
ed.hashes.sha512Async = (m: Uint8Array) => Promise.resolve(sha512(m))

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
    const publicKey = ed.getPublicKey(secretKey)
    return { publicKeyHex: bytesToHex(publicKey) }
  }

  const secretKey = ed.utils.randomSecretKey()
  const publicKey = ed.getPublicKey(secretKey)
  await writePrivateKeyHex(bytesToHex(secretKey))
  return { publicKeyHex: bytesToHex(publicKey) }
}

/**
 * Sign a challenge nonce (UTF-8) with the device private key.
 * Returns a hex-encoded Ed25519 signature (128 hex chars).
 */
export async function signChallengeNonce(nonce: string): Promise<string> {
  const privateKeyHex = await readPrivateKeyHex()
  if (!privateKeyHex) {
    throw new Error('Device private key is not available')
  }
  return signNonceWithPrivateKeyHex(nonce, privateKeyHex)
}

/** Remove the device private key (e.g. on reset enrollment). */
export async function clearDeviceKeypair(): Promise<void> {
  await deleteSecureItem(PRIVATE_KEY_STORAGE_KEY)
}
