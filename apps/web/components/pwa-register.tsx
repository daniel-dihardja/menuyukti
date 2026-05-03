'use client'

import { useEffect } from 'react'

/**
 * Registers the Serwist service worker when `withSerwist` runs with `register: false`.
 * In development Serwist is disabled — `window.serwist` is absent and this is a no-op.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const w = window as Window & { serwist?: { register: () => void } }
    if (w.serwist !== undefined) {
      w.serwist.register()
    }
  }, [])

  return null
}
