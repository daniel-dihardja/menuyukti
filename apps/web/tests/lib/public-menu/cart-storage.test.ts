import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearPublicMenuCart,
  loadPublicMenuCart,
  savePublicMenuCart,
} from '@/lib/public-menu/cart-storage'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('public-menu cart-storage', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createMemoryStorage())
    vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips cart lines for a location', () => {
    savePublicMenuCart(42, {
      7: { menuItemId: 7, name: 'Soup', price: 4.5, qty: 2 },
    })
    expect(loadPublicMenuCart(42)).toEqual({
      7: { menuItemId: 7, name: 'Soup', price: 4.5, qty: 2 },
    })
    expect(loadPublicMenuCart(99)).toEqual({})
  })

  it('clears storage when cart is empty or clear is called', () => {
    savePublicMenuCart(1, {
      3: { menuItemId: 3, name: 'Salad', price: 8, qty: 1 },
    })
    savePublicMenuCart(1, {})
    expect(loadPublicMenuCart(1)).toEqual({})

    savePublicMenuCart(1, {
      3: { menuItemId: 3, name: 'Salad', price: 8, qty: 1 },
    })
    clearPublicMenuCart(1)
    expect(loadPublicMenuCart(1)).toEqual({})
  })

  it('ignores malformed payloads', () => {
    sessionStorage.setItem('public-menu-cart:5', '{"nope":true}')
    expect(loadPublicMenuCart(5)).toEqual({})

    sessionStorage.setItem('public-menu-cart:5', 'not-json')
    expect(loadPublicMenuCart(5)).toEqual({})
  })
})
