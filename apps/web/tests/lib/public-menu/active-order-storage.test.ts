import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearPublicMenuActiveOrder,
  isGuestOrderComplete,
  isTerminalTicketStatus,
  loadPublicMenuActiveOrder,
  normalizeFulfillmentMode,
  normalizePrepStatus,
  normalizeTicketStatus,
  savePublicMenuActiveOrder,
} from '@/lib/public-menu/active-order-storage'

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

const sampleOrder = {
  orderId: 12,
  billNumber: 'B-12',
  fulfillmentMode: 'dine_in' as const,
  tableLabel: 'A1',
  prepStatus: 'RECEIVED' as const,
  status: 'open',
  lines: [{ menuItemId: 7, name: 'Soup' }],
}

describe('public-menu active-order-storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
    vi.stubGlobal('window', { localStorage: globalThis.localStorage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects terminal ticket statuses', () => {
    expect(isTerminalTicketStatus('paid')).toBe(true)
    expect(isTerminalTicketStatus('VOID')).toBe(true)
    expect(isTerminalTicketStatus('refunded')).toBe(true)
    expect(isTerminalTicketStatus('open')).toBe(false)
    expect(isTerminalTicketStatus(null)).toBe(false)
  })

  it('treats terminal prep as guest-order complete', () => {
    expect(isGuestOrderComplete('open', 'PICKED_UP')).toBe(true)
    expect(isGuestOrderComplete('open', 'SERVED')).toBe(true)
    expect(isGuestOrderComplete('open', 'DELIVERED')).toBe(true)
    expect(isGuestOrderComplete('open', 'READY')).toBe(false)
    expect(isGuestOrderComplete('paid', 'READY')).toBe(true)
  })

  it('normalizes GraphQL enum wire values', () => {
    expect(normalizeTicketStatus('OPEN')).toBe('open')
    expect(normalizeTicketStatus('paid')).toBe('paid')
    expect(normalizePrepStatus('received')).toBe('RECEIVED')
    expect(normalizePrepStatus('READY')).toBe('READY')
    expect(normalizeFulfillmentMode('DINE_IN')).toBe('dine_in')
    expect(normalizeFulfillmentMode('PICKUP')).toBe('pickup')
    expect(normalizeFulfillmentMode('DELIVERY')).toBe('delivery')
    expect(normalizePrepStatus('delivered')).toBe('DELIVERED')
  })

  it('round-trips a delivery active order', () => {
    savePublicMenuActiveOrder(7, {
      orderId: 99,
      billNumber: 'B-99',
      fulfillmentMode: 'delivery',
      tableLabel: null,
      prepStatus: 'READY',
      status: 'open',
      lines: [{ menuItemId: 1, name: 'Pizza' }],
    })
    expect(loadPublicMenuActiveOrder(7)).toMatchObject({
      orderId: 99,
      fulfillmentMode: 'delivery',
      prepStatus: 'READY',
      tableLabel: null,
    })
  })

  it('round-trips an active order for a location', () => {
    savePublicMenuActiveOrder(42, sampleOrder)
    const loaded = loadPublicMenuActiveOrder(42)
    expect(loaded).toMatchObject({
      orderId: 12,
      billNumber: 'B-12',
      fulfillmentMode: 'dine_in',
      tableLabel: 'A1',
      prepStatus: 'RECEIVED',
      status: 'open',
      lines: [{ menuItemId: 7, name: 'Soup' }],
    })
    expect(typeof loaded?.savedAt).toBe('number')
    expect(loadPublicMenuActiveOrder(99)).toBeNull()
  })

  it('clears storage on dismiss or terminal save', () => {
    savePublicMenuActiveOrder(1, sampleOrder)
    clearPublicMenuActiveOrder(1)
    expect(loadPublicMenuActiveOrder(1)).toBeNull()

    savePublicMenuActiveOrder(1, sampleOrder)
    savePublicMenuActiveOrder(1, { ...sampleOrder, status: 'paid' })
    expect(loadPublicMenuActiveOrder(1)).toBeNull()

    savePublicMenuActiveOrder(1, sampleOrder)
    savePublicMenuActiveOrder(1, { ...sampleOrder, prepStatus: 'PICKED_UP' })
    expect(loadPublicMenuActiveOrder(1)).toBeNull()
  })

  it('drops terminal or malformed payloads on load', () => {
    localStorage.setItem(
      'public-menu-active-order:5',
      JSON.stringify({ ...sampleOrder, status: 'void', savedAt: Date.now() }),
    )
    expect(loadPublicMenuActiveOrder(5)).toBeNull()

    localStorage.setItem(
      'public-menu-active-order:5',
      JSON.stringify({ ...sampleOrder, prepStatus: 'PICKED_UP', savedAt: Date.now() }),
    )
    expect(loadPublicMenuActiveOrder(5)).toBeNull()

    localStorage.setItem('public-menu-active-order:5', '{"nope":true}')
    expect(loadPublicMenuActiveOrder(5)).toBeNull()

    localStorage.setItem('public-menu-active-order:5', 'not-json')
    expect(loadPublicMenuActiveOrder(5)).toBeNull()
  })
})
