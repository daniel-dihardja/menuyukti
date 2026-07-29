/**
 * @noble/ed25519 expects Web Crypto `crypto.getRandomValues`.
 * React Native / Expo Go do not provide it — polyfill via expo-crypto.
 */
import { getRandomValues as expoGetRandomValues } from 'expo-crypto'

const root = globalThis as typeof globalThis & { crypto?: Crypto }

if (typeof root.crypto?.getRandomValues !== 'function') {
  Object.defineProperty(root, 'crypto', {
    value: {
      getRandomValues: (array: ArrayBufferView) => expoGetRandomValues(array as never),
    },
    configurable: true,
  })
}
