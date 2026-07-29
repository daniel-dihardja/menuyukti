import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'
import { describe, expect, it } from 'vitest'

import { bytesToHex } from '../lib/hex'
import { signNonceWithPrivateKeyHex } from '../lib/signNonce'

ed.hashes.sha512 = sha512
ed.hashes.sha512Async = (m: Uint8Array) => Promise.resolve(sha512(m))

describe('signNonceWithPrivateKeyHex', () => {
  it('produces a verifiable Ed25519 signature', async () => {
    const secretKey = ed.utils.randomSecretKey()
    const nonce = 'challenge-nonce-abc'
    const signatureHex = await signNonceWithPrivateKeyHex(nonce, bytesToHex(secretKey))
    expect(signatureHex).toMatch(/^[0-9a-f]{128}$/)

    const publicKey = ed.getPublicKey(secretKey)
    const ok = await ed.verifyAsync(
      Uint8Array.from(Buffer.from(signatureHex, 'hex')),
      new TextEncoder().encode(nonce),
      publicKey,
    )
    expect(ok).toBe(true)
  })
})
