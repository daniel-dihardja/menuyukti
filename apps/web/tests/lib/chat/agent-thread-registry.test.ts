import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => {
    store.clear()
  },
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size
  },
})

import {
  createAgentThread,
  getAgentThread,
  listAgentThreads,
  removeAgentThread,
  touchAgentThread,
} from '@/lib/chat/agent-thread-registry'

describe('agent-thread-registry', () => {
  beforeEach(() => {
    store.clear()
  })

  it('creates and lists threads newest-first', () => {
    const a = createAgentThread({ locationId: 1, analyticsRunId: 10, title: 'First' })
    const b = createAgentThread({ locationId: 1, analyticsRunId: null })
    const listed = listAgentThreads()
    expect(listed.map((t) => t.id)).toEqual([b.id, a.id])
    expect(getAgentThread(a.id)?.title).toBe('First')
  })

  it('touches and removes threads', () => {
    const a = createAgentThread({ locationId: 2 })
    touchAgentThread(a.id, { title: 'Updated' })
    expect(getAgentThread(a.id)?.title).toBe('Updated')
    removeAgentThread(a.id)
    expect(getAgentThread(a.id)).toBeNull()
    expect(listAgentThreads()).toEqual([])
  })
})
