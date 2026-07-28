import * as ed from '@noble/ed25519'

import { bytesToHex, hexToBytes } from './hex'

/**
 * Sign UTF-8 nonce with a hex Ed25519 private key.
 * Pure helper — safe for unit tests without React Native.
 * Callers that use @noble/ed25519 in RN must configure ed.hashes.sha512 first
 * (see keys.ts).
 */
export async function signNonceWithPrivateKeyHex(
  nonce: string,
  privateKeyHex: string,
): Promise<string> {
  const secretKey = hexToBytes(privateKeyHex)
  const message = new TextEncoder().encode(nonce)
  const signature = await ed.signAsync(message, secretKey)
  return bytesToHex(signature)
}
