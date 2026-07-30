import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { purgeWorkflowChatClientState } from '@/lib/chat/purge-workflow-chat-client-state'
import {
  readWorkflowChatMessages,
  writeWorkflowChatMessages,
} from '@/lib/chat/workflow-chat-message-cache'

function installStorageMock() {
  const sessionStore = new Map<string, string>()
  const localStore = new Map<string, string>()

  function makeStorage(store: Map<string, string>) {
    return {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null
      },
      setItem(key: string, value: string) {
        store.set(key, String(value))
      },
      removeItem(key: string) {
        store.delete(key)
      },
      clear() {
        store.clear()
      },
      get length() {
        return store.size
      },
      key(index: number) {
        return [...store.keys()][index] ?? null
      },
    }
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: makeStorage(sessionStore),
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: makeStorage(localStore),
  })
  return { sessionStore, localStore }
}

describe('purgeWorkflowChatClientState', () => {
  beforeEach(() => {
    installStorageMock()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
    Reflect.deleteProperty(globalThis, 'localStorage')
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('clears session, mode, image model, and message caches for one workflow', () => {
    const sid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    localStorage.setItem('menuyukti.wfChatSession.v1:10', sid)
    sessionStorage.setItem('menuyukti.wfChatMode.v1:10', 'general')
    sessionStorage.setItem('menuyukti.wfChatImageModel.v1:10', 'phoenix')
    writeWorkflowChatMessages('10', sid, [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ])
    localStorage.setItem('menuyukti.wfChatSession.v1:99', 'keep-me')
    writeWorkflowChatMessages('99', null, [
      { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'other' }] },
    ])

    purgeWorkflowChatClientState('10')

    expect(localStorage.getItem('menuyukti.wfChatSession.v1:10')).toBeNull()
    expect(sessionStorage.getItem('menuyukti.wfChatMode.v1:10')).toBeNull()
    expect(sessionStorage.getItem('menuyukti.wfChatImageModel.v1:10')).toBeNull()
    expect(readWorkflowChatMessages('10', sid)).toEqual([])
    expect(localStorage.getItem('menuyukti.wfChatSession.v1:99')).toBe('keep-me')
    expect(readWorkflowChatMessages('99', null)).toHaveLength(1)
  })
})
