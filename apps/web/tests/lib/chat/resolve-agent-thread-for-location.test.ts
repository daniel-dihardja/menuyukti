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
} from '@/lib/chat/agent-thread-registry'
import { rebindAgentThreadLocation } from '@/lib/chat/resolve-agent-thread-for-location'

describe('rebindAgentThreadLocation', () => {
  beforeEach(() => {
    store.clear()
  })

  it('updates locationId on the same thread and clears analyticsRunId', () => {
    const thread = createAgentThread({ locationId: 1, analyticsRunId: 99, title: 'Keep me' })
    const beforeCount = listAgentThreads().length

    const updated = rebindAgentThreadLocation(thread.id, 7)

    expect(updated?.id).toBe(thread.id)
    expect(updated?.locationId).toBe(7)
    expect(updated?.analyticsRunId).toBeNull()
    expect(updated?.title).toBe('Keep me')
    expect(listAgentThreads()).toHaveLength(beforeCount)
    expect(getAgentThread(thread.id)?.locationId).toBe(7)
  })

  it('rejects invalid location ids', () => {
    const thread = createAgentThread({ locationId: 1 })
    expect(() => rebindAgentThreadLocation(thread.id, 0)).toThrow('Invalid locationId')
  })

  it('returns null for unknown threads', () => {
    expect(rebindAgentThreadLocation('00000000-0000-4000-8000-000000000099', 2)).toBeNull()
  })
})
